import { h, render } from 'preact'
import { WorkspaceView, fs, type App, type WorkspaceLeaf } from '@typora-community-plugin/core'
import { Kanban } from './components/Kanban'
import { KanbanStateManager } from './state-manager'
import { mdToBoard } from './parsers/parse-markdown'
import type { KanbanI18n } from './i18n'
import type { KanbanSettings } from './settings'

export interface KanbanViewOptions {
  app: App
  i18n: KanbanI18n
  getGlobalSettings: () => Partial<KanbanSettings>
  /** 切回 Markdown 视图（由插件入口实现，负责 leaf 视图替换）。 */
  openAsMarkdown(leaf: WorkspaceLeaf): void
}

/**
 * 绑定 `.md` 文件的自定义视图。同一文件可随时切回 `core.markdown`。
 */
export class KanbanView extends WorkspaceView {

  static type = 'typora-plugin-kanban.board'

  /** `*.kanban.md` / `*.kanban.markdown` 由 workspace 按扩展名解析到此视图。 */
  static extensions = ['kanban.md', 'kanban.markdown']

  containerEl: HTMLElement = document.createElement('div')
  icon = 'fa-columns'

  private _stateManager?: KanbanStateManager
  private rootEl?: HTMLElement
  /** 上次打开的 stateManager，close→open 循环时复用，避免从磁盘重读丢失未保存内容。 */
  private _previousState?: KanbanStateManager

  constructor(leaf: WorkspaceLeaf, private options: KanbanViewOptions) {
    super(leaf)
  }

  get app(): App {
    return this.options.app
  }

  get filePath(): string {
    return this.leaf.state.path
  }

  get stateManager(): KanbanStateManager | undefined {
    return this._stateManager
  }

  onload() {
    this.containerEl.classList.add('typ-kanban-view')
  }

  onOpen(): void {
    // 视图可能被反复 open/close（切换标签页、切换视图类型），先清理上一次的挂载点。
    if (this.rootEl) {
      render(null, this.rootEl)
      this.rootEl.remove()
      this.rootEl = undefined
    }
    this.containerEl.innerHTML = ''

    // 复用已有的 stateManager（close→open 循环时不清理，避免从磁盘重读丢失未保存内容）。
    let sm: KanbanStateManager | undefined
    if (this._stateManager && !this._stateManager.disposed) {
      sm = this._stateManager
    } else if (this._previousState && !this._previousState.disposed) {
      // 复用上一次关闭前的 state，不重新解析磁盘内容。
      sm = this._previousState
    }

    if (!sm) {
      sm = new KanbanStateManager(this, mdToBoard({ path: this.filePath, md: this.readFile() }), {
        getGlobalSettings: this.options.getGlobalSettings,
      })
      // 全新创建说明没有可用的旧 state，清理缓存
      this._previousState = undefined
    }

    this.rootEl = document.createElement('div')
    this.rootEl.className = 'typ-kanban-root'
    this.containerEl.appendChild(this.rootEl)

    sm.registerAction('view-as-markdown', () => {
      // 延后到当前事件循环之外，避免在视图关闭过程中卸载 Preact 树。
      setTimeout(() => this.options.openAsMarkdown(this.leaf), 0)
    })
    this._stateManager = sm

    render(h(Kanban, { stateManager: sm, i18n: this.options.i18n }), this.rootEl)
  }

  onClose(): void {
    // 不清理 _stateManager，保留给下次 onOpen 复用（避免 close→open 循环时丢失内容）。
    // 标记为待回收，让 onOpen 可以安全判断。
    this._previousState = this._stateManager
    // flush 未落盘的改动，但不 dispose stateManager
    this._stateManager?.saveToDisk(true)
    this._stateManager = undefined
  }

  /** 全局设置变更时由插件入口调用。 */
  notifySettingsChanged(): void {
    this._stateManager?.notifyGlobalSettingsChanged()
  }

  /** 编辑器打开该文件时读编辑器内容，否则直接读文件（同步，供非 async `onOpen`）。 */
  readFile(): string {
    const { workspace } = this.app
    if (workspace.activeFile === this.filePath && workspace.activeEditor) {
      return workspace.activeEditor.getMarkdown()
    }
    return fs.readTextSync(this.filePath)
  }

  writeFile(md: string): void {
    const { workspace } = this.app
    if (workspace.activeFile === this.filePath && workspace.activeEditor) {
      workspace.activeEditor.setMarkdown(md)
    }
    else {
      void fs.writeText(this.filePath, md)
    }
  }

  getScroll() {
    return { scrollTop: this.containerEl.scrollTop }
  }

  applyScroll(state: { scrollTop: number }): void {
    this.containerEl.scrollTop = state.scrollTop
  }
}
