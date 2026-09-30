import './style.scss'
import {
  Plugin, I18n, PluginSettings, Notice, openInputBox,
  path, fs, type WorkspaceLeaf,
} from '@typora-community-plugin/core'
import { KanbanView } from './kanban/kanban-view'
import { KanbanSettingTab } from './settings/setting-tab'
import { openBoardSettingsModal } from './kanban/ui/board-settings-modal'
import { hasKanbanFlag, parseFrontmatter } from './kanban/parsers/frontmatter'
import { kanbanSettingKeys, defaultSettings, type KanbanSettings, type KanbanViewMode } from './kanban/settings'
import { fmt, type KanbanLocale } from './kanban/i18n'


/** core 右键菜单项的链式 API（`InternalContextMenu` 未从 core 导出，此处结构声明）。 */
interface FileMenuItem {
  setKey(key: string): FileMenuItem
  setTitle(title: string): FileMenuItem
  setIcon(icon: string): FileMenuItem
  onClick(callback: () => void): FileMenuItem
}

const NEW_BOARD_TEMPLATE = [
  '---',
  'kanban-plugin: board',
  '---',
  '',
  '## Todo',
  '',
  '- [ ] ',
  '',
].join('\n')

/**
 * Preact caches `Node.prototype.firstChild/nextSibling` descriptors on first
 * access. A few Typora renderer variants expose a `Node` constructor whose
 * prototype lacks these own accessor properties, which makes the first mount
 * throw `Cannot read properties of undefined`. Define them if they are missing.
 *
 * 参考 typora-plugin-chat `ensureSvelteDomShims`。
 */
function ensurePreactDomShims() {
  const w = window as unknown as Record<string, unknown>
  if (!w.Node && w.Element) w.Node = w.Element
  const proto = (w.Node as { prototype?: object } | undefined)?.prototype
  if (!proto) return

  if (!Object.getOwnPropertyDescriptor(proto, 'firstChild')) {
    Object.defineProperty(proto, 'firstChild', {
      configurable: true,
      get(this: { childNodes?: ArrayLike<ChildNode> | null }) {
        return this.childNodes?.[0] ?? null
      },
    })
  }

  if (!Object.getOwnPropertyDescriptor(proto, 'nextSibling')) {
    Object.defineProperty(proto, 'nextSibling', {
      configurable: true,
      get(this: { parentNode?: { childNodes: ArrayLike<ChildNode> } | null }) {
        const siblings = this.parentNode?.childNodes
        if (!siblings) return null
        const index = Array.prototype.indexOf.call(siblings, this)
        return index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null
      },
    })
  }
}

export default class extends Plugin<KanbanSettings> {

  i18n = new I18n<KanbanLocale>({
    localePath: path.join(this.manifest.dir!, 'locales'),
  })

  private _autoOpenGuard = 0

  onload() {
    ensurePreactDomShims()

    // --- 设置 ---------------------------------------------------------------
    this.registerSettings(new PluginSettings<KanbanSettings>(this.app, this.manifest, { version: 1 }))
    this.settings.setDefault(defaultSettings)
    this.register(this.settings.addChangeListener('*', () => this.notifySettingsChanged()))
    this.registerSettingTab(new KanbanSettingTab({ settings: this.settings, i18n: this.i18n }))

    // --- 自定义视图 ---------------------------------------------------------
    this.register(
      this.app.viewManager.registerView(KanbanView.type, leaf => new KanbanView(leaf, {
        app: this.app,
        i18n: this.i18n,
        getGlobalSettings: () => this.getGlobalSettings(),
        openAsMarkdown: l => this.openAsMarkdown(l),
      })))

    // --- 命令 ---------------------------------------------------------------
    const t = this.i18n.t
    this.registerCommand({
      id: 'open-as-kanban',
      title: t.command.openAsKanban,
      scope: 'global',
      callback: () => this.openAsKanban(),
    })
    this.registerCommand({
      id: 'toggle-kanban-view',
      title: t.command.toggleKanban,
      scope: 'global',
      callback: () => this.toggleKanbanView(),
    })
    this.registerCommand({
      id: 'create-new-kanban-board',
      title: t.command.createBoard,
      scope: 'global',
      callback: () => this.createBoardFromCommand(),
    })
    this.registerCommand({
      id: 'archive-completed-cards',
      title: t.command.archiveCompleted,
      scope: 'global',
      callback: () => {
        const view = this.getActiveKanbanView()
        if (!view) { new Notice(t.notice.noActiveBoard); return }
        view.stateManager?.runAction('archive-all')
      },
    })
    this.registerCommand({
      id: 'search-cards',
      title: t.board.search,
      scope: 'global',
      callback: () => this.getActiveKanbanView()?.stateManager?.runAction('open-search'),
    })
    this.registerCommand({
      id: 'add-kanban-lane',
      title: t.command.addLane,
      scope: 'global',
      callback: () => this.addLaneToActiveBoard(),
    })
    this.registerCommand({
      id: 'open-board-settings',
      title: t.command.openBoardSettings,
      scope: 'global',
      callback: () => {
        const view = this.getActiveKanbanView()
        if (!view?.stateManager) { new Notice(t.notice.noActiveBoard); return }
        openBoardSettingsModal(view.stateManager, this.i18n)
      },
    })
    this.registerCommand({
      id: 'view-board',
      title: t.command.viewBoard,
      scope: 'global',
      callback: () => this.setBoardView('board'),
    })
    this.registerCommand({
      id: 'view-list',
      title: t.command.viewList,
      scope: 'global',
      callback: () => this.setBoardView('list'),
    })
    this.registerCommand({
      id: 'view-table',
      title: t.command.viewTable,
      scope: 'global',
      callback: () => this.setBoardView('table'),
    })

    // --- 工作区 / 文件事件 ---------------------------------------------------
    this.register(this.app.workspace.on('file:open', filePath => this.onFileOpen(filePath)))
    this.register(this.app.workspace.on('file:will-save', filePath => this.onFileWillSave(filePath)))
    this.register(this.app.vault.on('file:rename', (oldPath, newPath) => this.onFileRename(oldPath, newPath)))
    this.register(this.app.workspace.on('file-menu', ({ menu, path: filePath }) => this.onFileMenu(menu, filePath)))
  }

  onunload() {
    // 资源由 Component.register 自动 dispose
  }

  // --- 设置 ---------------------------------------------------------------

  private getGlobalSettings(): Partial<KanbanSettings> {
    const out: Partial<KanbanSettings> = {}
    for (const key of kanbanSettingKeys) out[key] = this.settings.get(key)
    return out
  }

  private notifySettingsChanged(): void {
    for (const leaf of this.app.workspace.filterLeaves(l => l.viewType === KanbanView.type)) {
      (leaf.view as KanbanView).notifySettingsChanged()
    }
  }

  // --- 视图切换 -----------------------------------------------------------

  private getActiveKanbanView(): KanbanView | null {
    const leaf = this.app.workspace.activeLeaf
    if (leaf && leaf.viewType === KanbanView.type) return leaf.view as KanbanView
    return null
  }

  private findKanbanView(filePath: string): KanbanView | null {
    const leaf = this.app.workspace.findLeaf(
      l => l.viewType === KanbanView.type && l.state?.path === filePath)
    return (leaf?.view as KanbanView) ?? null
  }

  private swapLeafView(leaf: WorkspaceLeaf, type: string, state: Record<string, unknown>): void {
    try { leaf.view?.close() }
    catch { /* ignore */ }
    if (leaf.view?.containerEl?.parentElement === leaf.containerEl) {
      leaf.view.containerEl.remove()
    }
    leaf.setState({ type, state })
    leaf.view.open()
  }

  private openAsKanban(leaf: WorkspaceLeaf | null = this.app.workspace.activeLeaf): void {
    if (!leaf) return
    const filePath: string | undefined = leaf.state?.path ?? this.app.workspace.activeFile
    if (!filePath || filePath.startsWith('typ://')) return
    if (leaf.viewType === KanbanView.type) return

    this._autoOpenGuard = Date.now()
    const prev = { type: leaf.viewType, state: { ...leaf.state } }
    this.swapLeafView(leaf, KanbanView.type, { path: filePath, _kanbanPrev: prev })
  }

  private openAsMarkdown(leaf: WorkspaceLeaf): void {
    const prev = leaf.state?._kanbanPrev as { type: string; state: Record<string, unknown> } | undefined
    const filePath: string | undefined = leaf.state?.path ?? this.app.workspace.activeFile

    this._autoOpenGuard = Date.now()
    this.swapLeafView(leaf, prev?.type ?? 'core.markdown', prev?.state ?? { path: filePath })
  }

  private toggleKanbanView(): void {
    const leaf = this.app.workspace.activeLeaf
    if (!leaf) return
    if (leaf.viewType === KanbanView.type) this.openAsMarkdown(leaf)
    else this.openAsKanban(leaf)
  }

  private openPathAsKanban(filePath: string): void {
    const leaf = this.app.workspace.findLeaf(l => l.state?.path === filePath)
    if (leaf) {
      this.openAsKanban(leaf)
      return
    }
    void this.app.openFile(filePath).then(() => {
      setTimeout(() => this.openAsKanban(), 150)
    })
  }

  private openPathAsMarkdown(filePath: string): void {
    const leaf = this.app.workspace.findLeaf(
      l => l.viewType === KanbanView.type && l.state?.path === filePath)
    if (leaf) this.openAsMarkdown(leaf)
    else void this.app.openFile(filePath)
  }

  // --- 命令实现 -----------------------------------------------------------

  private addLaneToActiveBoard(): void {
    const view = this.getActiveKanbanView()
    if (view) {
      view.stateManager?.runAction('add-lane')
      return
    }
    const leaf = this.app.workspace.activeLeaf
    if (!leaf || !this.app.workspace.activeFile) {
      new Notice(this.i18n.t.notice.noActiveFile)
      return
    }
    this.openAsKanban(leaf)
    setTimeout(() => this.getActiveKanbanView()?.stateManager?.runAction('add-lane'), 200)
  }

  private setBoardView(mode: KanbanViewMode): void {
    const view = this.getActiveKanbanView()
    if (view) {
      view.stateManager?.runAction(`view-${mode}`)
      return
    }
    const leaf = this.app.workspace.activeLeaf
    if (!leaf || !this.app.workspace.activeFile) {
      new Notice(this.i18n.t.notice.noActiveBoard)
      return
    }
    this.openAsKanban(leaf)
    setTimeout(() => this.getActiveKanbanView()?.stateManager?.runAction(`view-${mode}`), 200)
  }

  private async createBoardFromCommand(): Promise<void> {
    const activeFile = this.app.workspace.activeFile
    const dir = activeFile ? path.dirname(activeFile) : this.app.vault.path
    await this.createBoard(dir)
  }

  private async createBoard(dir: string): Promise<void> {
    const t = this.i18n.t
    const name = await openInputBox({
      title: t.command.createBoard,
      placeholder: 'New Kanban Board',
    })
    if (!name) return

    const base = name.replace(/\.md$/i, '').trim()
    if (!base) return

    let filePath = path.join(dir, `${base}.md`)
    let suffix = 1
    while (await fs.exists(filePath)) {
      filePath = path.join(dir, `${base} ${++suffix}.md`)
    }

    await fs.writeText(filePath, NEW_BOARD_TEMPLATE)
    await this.app.openFile(filePath)
    new Notice(fmt(t.notice.boardCreated, { path: filePath }))
    setTimeout(() => this.openAsKanban(), 200)
  }

  // --- 事件处理 -----------------------------------------------------------

  private isKanbanExtension(file: string): boolean {
    const base = path.basename(file)
    return /\.kanban\.(md|markdown)$/i.test(base)
  }

  private isKanbanFile(filePath: string): boolean {
    if (!/\.(md|markdown)$/i.test(filePath)) return false
    try {
      return hasKanbanFlag(parseFrontmatter(fs.readTextSync(filePath)).frontmatter)
    }
    catch {
      return false
    }
  }

  private onFileOpen(filePath: string): void {
    if (Date.now() - this._autoOpenGuard < 1000) return

    const leaf = this.app.workspace.activeLeaf
    if (!leaf || leaf.viewType === KanbanView.type) return
    if (leaf.state?.path !== filePath) return

    let match: boolean
    if (this.settings.get('auto-open-kanban-extension') && this.isKanbanExtension(filePath)) {
      match = true
    }
    else if (this.settings.get('auto-open')) {
      match = this.isKanbanFile(filePath)
    }
    else {
      return
    }
    if (!match) return

    this.openAsKanban(leaf)
  }

  private onFileWillSave(filePath: string): void {
    const view = this.findKanbanView(filePath)
    const manager = view?.stateManager
    if (!manager) return
    if (manager.consumeSelfWrite()) return
    manager.forceRefresh()
  }

  private onFileRename(oldPath: string, newPath: string): void {
    for (const leaf of this.app.workspace.filterLeaves(
      l => l.viewType === KanbanView.type && l.state?.path === oldPath)) {
      leaf.state.path = newPath
      ;(leaf.view as KanbanView).stateManager?.updatePath(newPath)
    }
  }

  private onFileMenu(menu: unknown, filePath: string): void {
    const t = this.i18n.t
    const m = menu as { addItem(build: (item: FileMenuItem) => void): void }

    const isMd = /\.(md|markdown)$/i.test(filePath)

    if (isMd) {
      const isKanban = this.isKanbanFile(filePath)
      const openKanbanView = this.app.workspace.findLeaf(
        l => l.viewType === KanbanView.type && l.state?.path === filePath)

      if (isKanban) {
        m.addItem(item => item
          .setKey('kanban:open-as-kanban')
          .setTitle(t.menu.openAsKanban)
          .setIcon('columns')
          .onClick(() => this.openPathAsKanban(filePath)))
      }
      if (openKanbanView) {
        m.addItem(item => item
          .setKey('kanban:open-as-markdown')
          .setTitle(t.menu.openAsMarkdown)
          .setIcon('file-text-o')
          .onClick(() => this.openPathAsMarkdown(filePath)))
      }
    }
    else if (!path.extname(filePath)) {
      // 无扩展名 → 视为文件夹。
      m.addItem(item => item
        .setKey('kanban:new-board')
        .setTitle(t.menu.newBoard)
        .setIcon('columns')
        .onClick(() => { void this.createBoard(filePath) }))
    }
  }
}
