import type { Path } from '../types'

/**
 * 拖拽载荷。存于模块级 store，**不进入 board state**（避免拖拽期间重渲染看板）。
 *
 * 采用**鼠标事件**（mousedown/mousemove/mouseup）实现，而非 HTML5 DnD：
 * Typora 在 `document` 上全局拦截原生 `dragover`/`dragstart`（见
 * `resources/appsrc/window/frame.js`），原生拖放不可靠。参考 core
 * `ui/layout/tabs/draggable.ts`。
 */
export type DragPayload =
  | { kind: 'item'; from: Path; laneId: string }
  | { kind: 'lane'; fromIndex: number; laneId: string }

/** 卡片的落点：目标列 + 「插入到该下标（原数组）之前」。 */
export interface ItemDropTarget { kind: 'item'; laneIndex: number; index: number }
/** 列的落点：`index` = 「插入到该下标（原数组）之前」，可为 `lanes.length`。 */
export interface LaneDropTarget { kind: 'lane'; index: number }
export type DropTarget = ItemDropTarget | LaneDropTarget

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  if (a === b) return true
  if (!a || !b || a.kind !== b.kind) return false
  if (a.kind === 'lane' && b.kind === 'lane') return a.index === b.index
  if (a.kind === 'item' && b.kind === 'item') {
    return a.laneIndex === b.laneIndex && a.index === b.index
  }
  return false
}

type Listener = () => void

/** 拖拽状态 + 悬浮层 DOM 的单一持有者；仅当状态真正变化时才通知。 */
class DragStore {

  payload: DragPayload | null = null
  target: DropTarget | null = null
  floatingEl: HTMLElement | null = null

  private listeners = new Set<Listener>()

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  setPayload(payload: DragPayload | null): void {
    this.payload = payload
    this.emit()
  }

  setTarget(target: DropTarget | null): void {
    if (sameTarget(this.target, target)) return
    this.target = target
    this.emit()
  }

  setFloatingEl(el: HTMLElement | null): void {
    this.floatingEl = el
  }

  /** 结束拖拽并清理所有状态 / DOM / class。 */
  reset(): void {
    this.floatingEl?.remove()
    this.floatingEl = null
    this.payload = null
    this.target = null
    this.emit()
  }

  private emit(): void {
    for (const fn of this.listeners) fn()
  }
}

export const dragStore = new DragStore()
