const HEX_RE = /^#?[0-9a-fA-F]{6}$/

/** 解析 `tag-colors` 设置：每行一条 `#tag = #rrggbb`。 */
export function parseTagColors(raw: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*(#[^\s=]+)\s*=\s*(\S+)\s*$/.exec(line)
    if (!m) continue
    if (!HEX_RE.test(m[2])) continue
    map[m[1].toLowerCase()] = m[2].startsWith('#') ? m[2] : `#${m[2]}`
  }
  return map
}

/** 解析 `tag-sort` 设置：逗号分隔的标签优先顺序。 */
export function parseTagSort(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

/** 按优先顺序排序标签（未列出的保持原有相对顺序，排在后面）。 */
export function sortTags(tags: string[], order: string[]): string[] {
  if (!order.length) return tags
  const index = new Map(order.map((tag, i) => [tag.toLowerCase(), i]))
  return [...tags].sort((a, b) => {
    const ia = index.get(a.toLowerCase())
    const ib = index.get(b.toLowerCase())
    if (ia == null && ib == null) return 0
    if (ia == null) return 1
    if (ib == null) return -1
    return ia - ib
  })
}

/** 标签对应颜色（供 `style` 使用）；无配置返回 `null`。 */
export function tagStyle(tag: string, colors: Record<string, string>): { color: string; backgroundColor: string } | null {
  const color = colors[tag.toLowerCase()]
  if (!color) return null
  return { color, backgroundColor: `${color}22` }
}
