import type { Board, Item, Lane } from '../types'
import { stringifyFrontmatter } from './frontmatter'
import { serializeInlineMetadata } from './inline-metadata'
import { stripCollapsedMarker, withCollapsedMarker } from './lane-collapse'

export interface BoardToMdOptions {
  /** 为 true 时把 Lane 折叠态写入标题后的 HTML 注释（`list-collapse` 设置开启时）。 */
  persistCollapsed?: boolean
}

/**
 * Board → Markdown（规范形式）。
 *
 * 输出顺序：frontmatter → Lane 段落 → 归档块。
 * - Lane 段落：`## {titleRaw}` + 折叠标记 + 空行 + 每 item 一行 `- [{checkChar}] {content}`
 * - 归档块：`<!-- kanban:archive -->\n…\n<!-- /kanban:archive -->`
 * - 各段落以空行分隔；文件以换行结尾
 *
 * 注：折叠态随标题行以 `<!-- kanban:collapsed -->` 存储（`persistCollapsed` 控制），
 * 其余 Lane 级设置（`shouldMarkItemsComplete` / `maxItems` / `sorted`）暂不持久化。
 */
export function boardToMd(board: Board, opts: BoardToMdOptions = {}): string {
  const persistCollapsed = !!opts.persistCollapsed
  const parts: string[] = []

  // 板级设置写回 frontmatter `kanban-settings`（优先级高于全局设置）。
  const frontmatterData: Record<string, unknown> = { ...board.data.frontmatter }
  if (Object.keys(board.data.settings).length) {
    frontmatterData['kanban-settings'] = board.data.settings
  }

  const frontmatter = stringifyFrontmatter(frontmatterData)
  if (frontmatter) parts.push(frontmatter)

  for (const lane of board.lanes) parts.push(serializeLane(lane, persistCollapsed))

  if (board.data.archive.length) parts.push(serializeArchive(board.data.archive))

  return parts.length ? parts.join('\n\n') + '\n' : ''
}

function serializeLane(lane: Lane, persistCollapsed: boolean): string {
  const title = persistCollapsed
    ? withCollapsedMarker(lane.titleRaw, !!lane.collapsed)
    : stripCollapsedMarker(lane.titleRaw)
  const lines: string[] = [`## ${title}`, '']
  for (const item of lane.items) lines.push(serializeItem(item))
  return lines.join('\n')
}

function serializeArchive(archive: Item[]): string {
  const lines: string[] = ['<!-- kanban:archive -->']
  for (const item of archive) lines.push(serializeItem(item))
  lines.push('<!-- /kanban:archive -->')
  return lines.join('\n')
}

function serializeItem(item: Item): string {
  return `- [${item.checkChar}] ${serializeInlineMetadata(item)}`
}
