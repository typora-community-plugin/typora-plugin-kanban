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

    this.rootEl = document.createElement('div')
    this.rootEl.className = 'typ-kanban-root'
    this.containerEl.appendChild(this.rootEl)

    const md = this.readFile()
    const board = mdToBoard({ path: this.filePath, md })
    const stateManager = new KanbanStateManager(this, board, {
      getGlobalSettings: this.options.getGlobalSettings,
    })
    stateManager.registerAction('view-as-markdown', () => {
      // 延后到当前事件循环之外，避免在视图关闭过程中卸载 Preact 树。
      setTimeout(() => this.options.openAsMarkdown(this.leaf), 0)
    })
    this._stateManager = stateManager

    render(h(Kanban, { stateManager, i18n: this.options.i18n }), this.rootEl)
  }

  onClose(): void {
    this._stateManager?.saveToDisk(true)
    this._stateManager?.dispose()
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
