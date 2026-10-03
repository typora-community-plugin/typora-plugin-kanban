import { useEffect, useRef } from 'preact/hooks'
import { useKanban } from '../context'
import { renderMarkdownBlock } from '../../utils/markdown'

/** 把块级 Markdown 渲染为富文本（`text` 为原始 markdown，支持嵌套块）。 */
export function MarkdownInline(props: { text: string; query?: string }) {
  const { text, query = '' } = props
  const { stateManager } = useKanban()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    renderMarkdownBlock(text, el, stateManager.app, query)
  }, [text, query, stateManager])

  return <div ref={ref} />
}
