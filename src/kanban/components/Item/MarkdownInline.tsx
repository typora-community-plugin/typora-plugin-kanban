import { useEffect, useRef } from 'preact/hooks'
import type { JSX } from 'preact'
import { useKanban } from '../context'
import { renderMarkdownBlock } from '../../utils/markdown'

/** 把块级 Markdown 渲染为富文本（`text` 为原始 markdown，支持嵌套块）。 */
export function MarkdownInline(props: { text: string; query?: string; onToggleTask?: (index: number) => void }) {
  const { text, query = '', onToggleTask } = props
  const { stateManager } = useKanban()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    renderMarkdownBlock(text, el, stateManager.app, query)
  }, [text, query, stateManager])

  const checkboxOf = (target: EventTarget | null): HTMLInputElement | null => {
    return target instanceof HTMLInputElement && target.type === 'checkbox' ? target : null
  }

  // 阻止按在嵌套 checkbox 上时触发整卡拖拽。
  const onMouseDown = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (checkboxOf(e.target)) e.stopPropagation()
  }

  // 嵌套任务列表由 `renderTo` 渲染为静态 checkbox，点击需自行写回 `titleRaw`。
  const onClick = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    const input = checkboxOf(e.target)
    if (!input || !onToggleTask) return
    e.preventDefault()
    e.stopPropagation()

    const el = ref.current
    if (!el) return
    const boxes = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
    const index = boxes.indexOf(input)
    if (index >= 0) onToggleTask(index)
  }

  return <div ref={ref} onMouseDown={onMouseDown} onClick={onClick} />
}
