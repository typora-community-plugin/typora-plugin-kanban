import { useEffect, useMemo, useRef } from 'preact/hooks'
import { renderInlineMarkdown, typesetInlineMath } from '../../utils/markdown'

/** 把行内 Markdown 渲染为富文本（`text` 为原始 markdown）。 */
export function MarkdownInline(props: { text: string; query?: string }) {
  const { text, query = '' } = props
  const ref = useRef<HTMLSpanElement>(null)
  const html = useMemo(() => renderInlineMarkdown(text, query), [text, query])

  useEffect(() => {
    if (ref.current) typesetInlineMath(ref.current)
  }, [html])

  return <span ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
