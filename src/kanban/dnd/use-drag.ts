import { useEffect, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { useKanban } from '../components/context'
import { c } from '../components/helpers'
import type { Lane, Path } from '../types'
import {
  dragStore,
  type DragPayload,
  type DropTarget,
  type ItemDropTarget,
  type LaneDropTarget,
} from './drag-store'
import { createDragGhost, moveDragGhost } from './drag-layer'

export type DragEvt = JSX.TargetedMouseEvent<HTMLElement>

/** 拖动阈值（px），小于该距离视为点击而非拖拽。 */
const DRAG_THRESHOLD = 5
const SCROLL_EDGE = 48
const SCROLL_STEP = 14

/** 订阅模块级拖拽 store（仅在载荷 / 落点变化时重渲染）。 */
export function useDragStore() {
  const [, force] = useState(0)
  useEffect(() => dragStore.subscribe(() => force(n => n + 1)), [])
  return { payload: dragStore.payload, target: dragStore.target }
}

function samePath(a: Path, b: Path): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

/** 不把 checkbox / 按钮 / 输入框等交互控件上的按下当作拖拽起点。 */
function isInteractive(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return !!el?.closest('button, input, textarea, select, a, [contenteditable="true"]')
}

function elementAt(x: number, y: number): HTMLElement | null {
  return document.elementFromPoint(x, y) as HTMLElement | null
}

/** 依据鼠标位置计算卡片落点（卡片中线；列空白区 → 末尾）。 */
function computeItemTarget(x: number, y: number): ItemDropTarget | null {
  const el = elementAt(x, y)
  if (!el) return null

  const itemEl = el.closest(`.${c('item-wrapper')}`) as HTMLElement | null
  if (itemEl) {
    const laneIndex = Number(itemEl.dataset.laneIndex)
    const itemIndex = Number(itemEl.dataset.itemIndex)
    if (Number.isNaN(laneIndex) || Number.isNaN(itemIndex)) return null
    const rect = itemEl.getBoundingClientRect()
    const before = y < rect.top + rect.height / 2
    return { kind: 'item', laneIndex, index: before ? itemIndex : itemIndex + 1 }
  }

  const laneEl = el.closest(`.${c('lane-wrapper')}`) as HTMLElement | null
  if (laneEl) {
    const laneIndex = Number(laneEl.dataset.laneIndex)
    const count = Number(laneEl.dataset.itemCount)
    if (Number.isNaN(laneIndex)) return null
    return { kind: 'item', laneIndex, index: Number.isNaN(count) ? 0 : count }
  }

  return null
}

/** 依据鼠标位置计算列落点（列中线）。 */
function computeLaneTarget(x: number, y: number): LaneDropTarget | null {
  const laneEl = elementAt(x, y)?.closest(`.${c('lane-wrapper')}`) as HTMLElement | null
  if (!laneEl) return null
  const index = Number(laneEl.dataset.laneIndex)
  if (Number.isNaN(index)) return null
  const rect = laneEl.getBoundingClientRect()
  const before = x < rect.left + rect.width / 2
  return { kind: 'lane', index: before ? index : index + 1 }
}

/** 拖拽至容器左右边缘时横向自动滚动。 */
function autoScroll(x: number): void {
  const board = document.querySelector(`.${c('board')}`) as HTMLElement | null
  if (!board) return
  const rect = board.getBoundingClientRect()
  if (x < rect.left + SCROLL_EDGE) board.scrollLeft -= SCROLL_STEP
  else if (x > rect.right - SCROLL_EDGE) board.scrollLeft += SCROLL_STEP
}

interface MouseDragOptions {
  payload: DragPayload
  createGhost: (x: number, y: number) => HTMLElement | null
  computeTarget: (x: number, y: number) => DropTarget | null
  onDrop: (target: DropTarget | null) => void
}

/**
 * 鼠标拖拽控制器（参考 core `ui/layout/tabs/draggable.ts`）。
 *
 * mousedown 立即 `preventDefault()`（阻止文本选择 / 原生拖放），记录起点；
 * mousemove 超过阈值后才真正开始拖拽（创建浮层、进入拖拽态）；
 * mouseup 计算最终落点并回调，随后清理。监听器用 capture 绑定在 document 上，
 * 避免被其它处理器中断。
 */
function beginMouseDrag(e: MouseEvent, options: MouseDragOptions): void {
  if (e.button !== 0) return
  e.preventDefault()

  const startX = e.clientX
  const startY = e.clientY
  let active = false
  let ghost: HTMLElement | null = null
  let target: DropTarget | null = null

  const onMove = (ev: MouseEvent) => {
    if (!active) {
      if (Math.abs(ev.clientX - startX) < DRAG_THRESHOLD
        && Math.abs(ev.clientY - startY) < DRAG_THRESHOLD) return
      active = true
      ghost = options.createGhost(ev.clientX, ev.clientY)
      dragStore.setFloatingEl(ghost)
      dragStore.setPayload(options.payload)
      document.body.classList.add(c('dragging'))
    }
    ev.preventDefault()
    if (ghost) moveDragGhost(ghost, ev.clientX, ev.clientY)
    autoScroll(ev.clientX)
    target = options.computeTarget(ev.clientX, ev.clientY)
    dragStore.setTarget(target)
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove, true)
    document.removeEventListener('mouseup', onUp, true)
    document.body.classList.remove(c('dragging'))
    if (active) options.onDrop(target)
    dragStore.reset()
  }

  document.addEventListener('mousemove', onMove, true)
  document.addEventListener('mouseup', onUp, true)
}

/** 卡片的拖拽（整卡按下即可能拖拽，交互控件除外）。 */
export function useDragItem(path: Path, laneId: string) {
  const { modifiers } = useKanban()
  const drag = useDragStore()
  const [laneIndex, itemIndex] = path

  const isDragging = drag.payload?.kind === 'item' && samePath(drag.payload.from, path)
  const dropBefore = drag.target?.kind === 'item'
    && drag.target.laneIndex === laneIndex && drag.target.index === itemIndex
  const dropAfter = drag.target?.kind === 'item'
    && drag.target.laneIndex === laneIndex && drag.target.index === itemIndex + 1

  const onMouseDown = (e: DragEvt) => {
    if (isInteractive(e.target)) return
    const source = e.currentTarget as HTMLElement
    beginMouseDrag(e, {
      payload: { kind: 'item', from: path, laneId },
      createGhost: (x, y) => createDragGhost(source, x, y),
      computeTarget: computeItemTarget,
      onDrop: (t) => {
        if (t?.kind === 'item') modifiers.moveEntity(path, [t.laneIndex, t.index])
      },
    })
  }

  return { isDragging, dropBefore, dropAfter, onMouseDown }
}

export interface DragGripProps {
  onMouseDown: (e: DragEvt) => void
}

/** 列的拖拽（grip 为 handle）。 */
export function useDragLane(lane: Lane, index: number) {
  const { modifiers } = useKanban()
  const drag = useDragStore()
  const laneId = lane.id

  const isDragging = drag.payload?.kind === 'lane' && drag.payload.laneId === laneId
  const dropBefore = drag.target?.kind === 'lane' && drag.target.index === index
  const dropAfter = drag.target?.kind === 'lane' && drag.target.index === index + 1
  const isDroppingItems = drag.target?.kind === 'item' && drag.target.laneIndex === index

  const gripProps: DragGripProps = {
    onMouseDown: (e) => {
      const handle = e.currentTarget as HTMLElement
      const laneEl = handle.closest(`.${c('lane-wrapper')}`) as HTMLElement | null
      beginMouseDrag(e, {
        payload: { kind: 'lane', fromIndex: index, laneId },
        createGhost: (x, y) => (laneEl ? createDragGhost(laneEl, x, y) : null),
        computeTarget: computeLaneTarget,
        onDrop: (t) => {
          if (t?.kind === 'lane') modifiers.moveEntity([index], [t.index])
        },
      })
    },
  }

  return { isDragging, dropBefore, dropAfter, isDroppingItems, gripProps }
}
