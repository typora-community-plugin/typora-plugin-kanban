/**
 * Lane 折叠态以 HTML 注释跟随在标题后（`## Title <!-- kanban:collapsed -->`）。
 *
 * 相比按列下标存储数组，标记随标题一起移动，拖拽/增删列后折叠态不会错位。
 */
export const COLLAPSED_MARKER = '<!-- kanban:collapsed -->'

const COLLAPSED_MARKER_RE = /\s*<!--\s*kanban:collapsed\s*-->\s*$/

/** 标题是否以折叠标记结尾。 */
export function hasCollapsedMarker(title: string): boolean {
  return COLLAPSED_MARKER_RE.test(title)
}

/** 去掉标题末尾的折叠标记并 trim。 */
export function stripCollapsedMarker(title: string): string {
  return title.replace(COLLAPSED_MARKER_RE, '').trim()
}

/** 按折叠态为标题追加/移除折叠标记（先清理已有标记，避免重复）。 */
export function withCollapsedMarker(title: string, collapsed: boolean): string {
  const base = stripCollapsedMarker(title)
  return collapsed ? `${base} ${COLLAPSED_MARKER}` : base
}
