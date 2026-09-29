import type { ComponentChildren } from 'preact'

/** 将 `text` 中命中 `query` 的片段包裹为 `<mark class="is-search-match">`。 */
export function Highlight(props: { text: string; query: string }) {
  const { text, query } = props
  const q = query.trim().toLowerCase()
  if (!q) return <>{text}</>

  const lower = text.toLowerCase()
  const parts: ComponentChildren[] = []
  let from = 0
  let key = 0

  while (from < text.length) {
    const at = lower.indexOf(q, from)
    if (at < 0) {
      parts.push(text.slice(from))
      break
    }
    if (at > from) parts.push(text.slice(from, at))
    parts.push(
      <mark class="is-search-match typ-kanban-search-match" key={key++}>
        {text.slice(at, at + q.length)}
      </mark>,
    )
    from = at + q.length
  }

  return <>{parts}</>
}
