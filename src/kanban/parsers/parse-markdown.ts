import { createItem, createLane, type Board, type Item } from '../types'
import { extractBoardSettings, parseFrontmatter } from './frontmatter'
import { parseInlineMetadata } from './inline-metadata'
import { hasCollapsedMarker, stripCollapsedMarker } from './lane-collapse'

const ARCHIVE_RE = /<!--\s*kanban:archive\s*-->([\s\S]*?)<!--\s*\/kanban:archive\s*-->/
const LANE_HEADING_RE = /^##\s+(.+?)\s*$/
const CHECKBOX_ITEM_RE = /^[-*+]\s+\[(.)\]\s*(.*)$/
const PLAIN_ITEM_RE = /^[-*+]\s+(.*)$/
const LEADING_INDENT_RE = /^(\s+)/

interface RawItem { raw: string; checked: boolean; checkChar: Item['checkChar'] }

/**
 * Markdown → Board。
 *
 * 算法：
 *   1. `parseFrontmatter` 拆分 frontmatter / body（无 frontmatter 时 body = 全文）
 *   2. 抽取归档块 `<!-- kanban:archive -->…<!-- /kanban:archive -->`
 *   3. 正文按 `^##\s+(.+)$` 切分 Lane；`#` 顶级标题与非列表散句忽略
 *   4. 每 Lane：`- [ ] title #tag [key:: val]` → Item；缩进/续行追加到上一 Item
 *   5. 归档块内列表 → `board.data.archive`
 *   6. 空 board → `lanes = []`（View 显示唯一 LaneForm）
 */
export function mdToBoard(opts: { path: string; md: string }): Board {
  const { path, md } = opts
  const { frontmatter, body } = parseFrontmatter(md)

  const archiveMatch = ARCHIVE_RE.exec(body)
  const archiveRaw = archiveMatch ? archiveMatch[1] : ''
  const bodyWithoutArchive = archiveMatch ? body.replace(ARCHIVE_RE, '') : body

  const lanes = splitLanes(bodyWithoutArchive).map(section => {
    const lane = createLane(section.title)
    lane.items = parseItems(section.content)
    if (section.collapsed) lane.collapsed = true
    return lane
  })

  return {
    id: path,
    path,
    data: {
      frontmatter,
      settings: extractBoardSettings(frontmatter),
      archive: parseItems(archiveRaw),
    },
    lanes,
  }
}

function splitLanes(body: string): Array<{ title: string; content: string; collapsed: boolean }> {
  const sections: Array<{ title: string; content: string; collapsed: boolean }> = []
  let current: { title: string; lines: string[]; collapsed: boolean } | null = null

  for (const line of body.split(/\r?\n/)) {
    const heading = LANE_HEADING_RE.exec(line)
    if (heading) {
      if (current) sections.push({ title: current.title, content: current.lines.join('\n'), collapsed: current.collapsed })
      current = {
        title: stripCollapsedMarker(heading[1]),
        lines: [],
        collapsed: hasCollapsedMarker(heading[1]),
      }
    }
    else if (current) {
      current.lines.push(line)
    }
    // 首个 `##` 之前的散句 / `#` 顶级标题：忽略
  }
  if (current) sections.push({ title: current.title, content: current.lines.join('\n'), collapsed: current.collapsed })

  return sections
}

function parseItems(content: string): Item[] {
  const rawItems: RawItem[] = []
  let current: RawItem | null = null

  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === '') continue

    // Detect leading indentation — nested list items are sub-content, not new cards
    const indentMatch = LEADING_INDENT_RE.exec(line)
    const hasIndent = !!indentMatch

    const checkbox = CHECKBOX_ITEM_RE.exec(line)
    const plain = PLAIN_ITEM_RE.exec(line)

    if (checkbox && !hasIndent) {
      // Only top-level checkbox items become new cards; nested ones are sub-content
      const checkChar = normalizeCheckChar(checkbox[1])
      current = { raw: checkbox[2], checked: checkChar !== ' ', checkChar }
      rawItems.push(current)
    }
    else if (plain && !hasIndent) {
      // Only top-level plain list items become new cards
      current = { raw: plain[1], checked: false, checkChar: ' ' }
      rawItems.push(current)
    }
    else if (current) {
      // indented lines / non-list content → append to previous Item as sub-content
      current.raw += '\n' + line
    }
  }

  return rawItems.map(ri => {
    const parsed = parseInlineMetadata(ri.raw)
    return {
      ...createItem(parsed.titleRaw),
      checked: ri.checked,
      checkChar: ri.checkChar,
      title: parsed.title,
      metadata: parsed.metadata,
    }
  })
}

function normalizeCheckChar(c: string): Item['checkChar'] {
  return c === 'x' || c === 'X' || c === '-' ? c : ' '
}
