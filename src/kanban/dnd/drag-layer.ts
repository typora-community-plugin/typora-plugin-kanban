import { c } from '../components/helpers'

/** 生成跟随鼠标的 `position: fixed` DOM 克隆（拖拽浮层）。 */
export function createDragGhost(source: HTMLElement, x: number, y: number): HTMLElement {
  const rect = source.getBoundingClientRect()
  const ghost = source.cloneNode(true) as HTMLElement

  ghost.classList.add(c('drag-ghost'))
  Object.assign(ghost.style, {
    position: 'fixed',
    width: `${rect.width}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '1000',
    opacity: '.85',
  })

  document.body.appendChild(ghost)
  moveDragGhost(ghost, x, y)
  return ghost
}

/** 移动悬浮层到鼠标位置（右下偏移）。 */
export function moveDragGhost(ghost: HTMLElement, x: number, y: number): void {
  ghost.style.left = `${x + 12}px`
  ghost.style.top = `${y + 12}px`
}
