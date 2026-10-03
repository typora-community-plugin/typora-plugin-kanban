import type { Board } from './types'
import type { KanbanSettings } from '../settings/settings'
import { defaultSettings } from '../settings/settings'
import { mdToBoard } from './parsers/parse-markdown'
import { boardToMd } from './parsers/serialize'
import type { KanbanView } from './kanban-view'
import { useEffect, useState } from 'preact/hooks'

export interface KanbanStateManagerOptions {
  /** 全局设置来源（Phase 7 接入 PluginSettings；Phase 2 返回 `{}`）。 */
  getGlobalSettings?: () => Partial<KanbanSettings>
}

/**
 * 单一数据源 + 订阅 + 不可变更新。
 *
 * 优先级：板级 `board.data.settings` → 全局 settings → `defaultSettings`。
 */
export class KanbanStateManager {

  board: Board

  private stateReceivers = new Set<(b: Board) => void>()
  private settingNotifiers = new Map<keyof KanbanSettings, Set<(v: unknown) => void>>()
  private actions = new Map<string, () => void>()
  private saveTimer: number | null = null
  private _selfWrite = false
  private _disposed = false

  constructor(
    private view: KanbanView,
    initial: Board,
    private options: KanbanStateManagerOptions = {},
  ) {
    this.board = initial
    this.applyCollapseSetting()
  }

  setState(next: Board | ((prev: Board) => Board), opts?: { save?: boolean }): void {
    if (this.disposed) return
    this.board = typeof next === 'function' ? next(this.board) : next
    this.notify()
    if (opts?.save !== false) this.saveToDisk()
  }

  subscribe(cb: (b: Board) => void): () => void {
    this.stateReceivers.add(cb)
    return () => { this.stateReceivers.delete(cb) }
  }

  getSetting<K extends keyof KanbanSettings>(key: K): KanbanSettings[K] {
    const boardValue = this.board.data.settings[key]
    if (boardValue !== undefined) return boardValue as KanbanSettings[K]

    const globalValue = this.options.getGlobalSettings?.()[key]
    if (globalValue !== undefined) return globalValue as KanbanSettings[K]

    return defaultSettings[key]
  }

  setSetting<K extends keyof KanbanSettings>(key: K, value: KanbanSettings[K]): void {
    this.setState(b => ({
      ...b,
      data: { ...b.data, settings: { ...b.data.settings, [key]: value } },
    }), { save: true })
    this.settingNotifiers.get(key)?.forEach(cb => cb(value))
  }

  subscribeSetting<K extends keyof KanbanSettings>(key: K, cb: (v: KanbanSettings[K]) => void): () => void {
    let set = this.settingNotifiers.get(key)
    if (!set) {
      set = new Set()
      this.settingNotifiers.set(key, set)
    }
    set.add(cb as (v: unknown) => void)
    return () => { set!.delete(cb as (v: unknown) => void) }
  }

  newBoard(path: string, md: string): Board {
    this.board = mdToBoard({ path, md })
    this.applyCollapseSetting()
    this.notify()
    return this.board
  }

  /** 文件重命名后更新板标识（不重解析）。 */
  updatePath(path: string): void {
    this.board = { ...this.board, id: path, path }
    this.notify()
  }

  /** 写回文件（默认 debounce 300ms；`immediate` 用于关闭前 flush）。 */
  saveToDisk(immediate = false): void {
    if (this.disposed) return

    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    if (immediate) {
      this.flush()
      return
    }

    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null
      this.flush()
    }, 300)
  }

  /** 注册视图级动作（命令 / Header 按钮触发，如 `view-as-markdown`）。 */
  registerAction(name: string, fn: () => void): () => void {
    this.actions.set(name, fn)
    return () => { if (this.actions.get(name) === fn) this.actions.delete(name) }
  }

  /** 执行已注册动作（不存在时静默忽略）。 */
  runAction(name: string): void {
    this.actions.get(name)?.()
  }

  /** 全局设置变更 → 重新通知所有已订阅设置 + 软刷新。 */
  notifyGlobalSettingsChanged(): void {
    for (const [key, set] of this.settingNotifiers) {
      const value = this.getSetting(key)
      for (const cb of set) cb(value)
    }
    this.softRefresh()
  }

  /** 浅拷贝 → 通知，不重解析。 */
  softRefresh(): void {
    this.board = { ...this.board, data: { ...this.board.data } }
    this.notify()
  }

  /** 重读文件 + 重解析。 */
  forceRefresh(): void {
    const md = this.view.readFile()
    this.newBoard(this.view.filePath, md)
  }

  /** 自身写入触发 `file:will-save` 时消费一次，避免回环刷新。 */
  consumeSelfWrite(): boolean {
    if (!this._selfWrite) return false
    this._selfWrite = false
    return true
  }

  get disposed(): boolean {
    return this._disposed
  }

  dispose(): void {
    if (this.disposed) return
    // flush 未落盘的改动
    if (this.saveTimer !== null) {
      this.saveToDisk(true)
    }
    this._disposed = true
    this.stateReceivers.clear()
    this.settingNotifiers.clear()
    this.actions.clear()
  }

  private notify(): void {
    for (const cb of this.stateReceivers) cb(this.board)
  }

  private applyCollapseSetting(): void {
    // 未开启「记住折叠的列表」时，忽略文件中残留的折叠标记。
    if (this.getSetting('list-collapse')) return
    for (const lane of this.board.lanes) {
      if (lane.collapsed) lane.collapsed = false
    }
  }

  private flush(): void {
    const md = boardToMd(this.board, { persistCollapsed: this.getSetting('list-collapse') })
    this._selfWrite = true
    try {
      this.view.writeFile(md)
    }
    finally {
      // 兜底：一个 tick 后自动复位（若未被 consumeSelfWrite 消费）
      window.setTimeout(() => { this._selfWrite = false }, 0)
    }
  }
}

// --- Preact hooks ---------------------------------------------------------

export function useStateManager(m: KanbanStateManager): Board {
  const [board, setBoard] = useState(m.board)
  useEffect(() => m.subscribe(setBoard), [m])
  return board
}

export function useKanbanSetting<K extends keyof KanbanSettings>(m: KanbanStateManager, key: K): KanbanSettings[K] {
  const [value, setValue] = useState(m.getSetting(key))
  useEffect(() => m.subscribeSetting(key, setValue), [m, key])
  return value
}
