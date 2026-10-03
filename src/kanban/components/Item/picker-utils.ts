import { useLayoutEffect, useRef, useState } from 'preact/hooks'

export interface Coordinates { x: number; y: number }

/** 弹出面板与视口边缘的最小间距（px）。 */
const GAP = 8

/**
 * 从鼠标事件获取弹出坐标；事件缺失（键盘触发）或坐标为 0 时，
 * 回退到 `fallback` 元素的 `getBoundingClientRect()`（左下角）。对应计划 p1-2。
 */
export function constructCoordinates(
  e?: { clientX?: number; clientY?: number } | Event | null,
  fallback?: Element | null
): Coordinates {
  const pointer = e as { clientX?: number; clientY?: number } | null | undefined
  if (pointer && (pointer.clientX || pointer.clientY)) {
    return { x: pointer.clientX as number, y: pointer.clientY as number }
  }
  const rect = fallback?.getBoundingClientRect()
  if (rect) return { x: rect.left, y: rect.bottom + 4 }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

/**
 * 绝对定位 + 边界检测 hook。对应计划 p2-2 / p2-3：
 * 面板以 `position: fixed` 渲染在坐标处；超过视口时向左 / 向上翻转，并夹紧到边缘。
 * 首次布局前用 `visibility: hidden` 避免跳变。
 */
export function useBoundaryPosition(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: y, left: x, measured: false })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()

    let left = x
    if (left + rect.width + GAP > window.innerWidth) left = x - rect.width
    left = Math.max(GAP, Math.min(left, window.innerWidth - rect.width - GAP))

    let top = y
    if (top + rect.height + GAP > window.innerHeight) top = y - rect.height
    top = Math.max(GAP, Math.min(top, window.innerHeight - rect.height - GAP))

    setPos({ top, left, measured: true })
  }, [x, y])

  return {
    ref,
    style: {
      top: `${pos.top}px`,
      left: `${pos.left}px`,
      visibility: pos.measured ? 'visible' : 'hidden',
    } as const,
  }
}
