import type { Board, Item, Lane } from '../types'
import { stringifyFrontmatter } from './frontmatter'
import { serializeInlineMetadata } from './inline-metadata'

/**
 * Board → Markdown（规范形式）。
 *
 * 输出顺序：frontmatter → Lane 段落 → 归档块。
 * - Lane 段落：`## {titleRaw}\n\n` + 每 item 一行 `- [{checkChar}] {content}`
 * - 归档块：`<!-- kanban:archive -->\n…\n<!-- /kanban:archive -->`
 * - 各段落以空行分隔；文件以换行结尾
 *
 * 注：MVP 不持久化 Lane 级设置（`shouldMarkItemsComplete` / `maxItems` / `collapsed`
 * / `sorted`），仅 frontmatter 存板级设置。见计划 Phase 11 TODO。
 */
export function boardToMd(board: Board): string {
  const parts: string[] = []

  // 板级设置写回 frontmatter `kanban-settings`（优先级高于全局设置）。
  const frontmatterData: Record<string, unknown> = { ...board.data.frontmatter }
  if (Object.keys(board.data.settings).length) {
    frontmatterData['kanban-settings'] = board.data.settings
  }

  const frontmatter = stringifyFrontmatter(frontmatterData)
  if (frontmatter) parts.push(frontmatter)

  for (const lane of board.lanes) parts.push(serializeLane(lane))

  if (board.data.archive.length) parts.push(serializeArchive(board.data.archive))

  return parts.length ? parts.join('\n\n') + '\n' : ''
}

function serializeLane(lane: Lane): string {
  const lines: string[] = [`## ${lane.titleRaw}`, '']
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
