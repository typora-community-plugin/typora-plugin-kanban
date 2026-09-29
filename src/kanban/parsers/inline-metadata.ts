import type { InlineField, Item, ItemMetadata } from '../types'

interface Span { start: number; end: number }
interface FieldSpan extends Span { key: string; value: string; isDate: boolean }
interface TagSpan extends Span { tag: string }

const BRACE_FIELD_RE = /\{\{([^:}]+?)::\s*([\s\S]*?)\}\}/g
const BARE_FIELD_RE = /(^|\s)([A-Za-z0-9_\u4e00-\u9fa5][\w\u4e00-\u9fa5/-]*)::[ \t]*([^\n]*?)(?=\s+[A-Za-z0-9_\u4e00-\u9fa5][\w\u4e00-\u9fa5/-]*::|\s+[#@]|$)/gm
const TAG_RE = /(^|\s)#([\w\u4e00-\u9fa5/-]+)/g
const AT_DATE_RE = /@(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/g
const KEYWORD_DATE_RE = /(?:^|\s)(due|start|date)\s*::\s*(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/gi

const DATE_KEYWORDS = new Set(['due', 'start', 'date'])
const DATE_VALUE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 拆分 item 内容为 `titleRaw`（不含 metadata token）、`title`（纯文本）与 `metadata`。
 *
 * 处理顺序（避免互相误吞）：
 *   1. 提取 `{{key:: value}}`
 *   2. 提取裸 `key:: value`（`due/start/date` + 日期 → 归入 date，不视为 inlineField）
 *   3. 提取 `#tag`
 *   4. 提取 `@YYYY-MM-DD[ HH:mm]` / `due|start|date:: 日期`
 *   5. `titleRaw` = 剩余 markdown（空白规范化）
 *
 * 所有 span 坐标均基于原始字符串：处理中通过「等长掩码」屏蔽已识别区域，
 * 从而无需坐标换算。
 */
export function parseInlineMetadata(raw: string): {
  titleRaw: string
  title: string
  metadata: ItemMetadata
} {
  const braceFields = findBraceFields(raw)
  const maskedBrace = maskSpans(raw, braceFields)

  const bareFields = findBareFields(maskedBrace)
  const moveFields = bareFields.filter(f => !f.isDate)
  const maskedBare = maskSpans(maskedBrace, moveFields)

  const tagSpans = findTags(maskedBare)
  const maskedTags = maskSpans(maskedBare, tagSpans)

  const { date, time, spans: dateSpans } = findDateTokens(maskedTags)

  const inlineFields: InlineField[] = [
    ...braceFields.map(f => ({ key: f.key, value: f.value })),
    ...moveFields.map(f => ({ key: f.key, value: f.value })),
  ]

  const titleRaw = normalizeTitle(removeSpans(raw, [...braceFields, ...moveFields, ...tagSpans, ...dateSpans]))

  const metadata: ItemMetadata = {}
  if (date) metadata.date = date
  if (time) metadata.time = time
  if (tagSpans.length) metadata.tags = tagSpans.map(t => t.tag)
  if (inlineFields.length) metadata.inlineFields = inlineFields

  return { titleRaw, title: stripMarkdown(titleRaw), metadata }
}

/** 还原 item 内容：`titleRaw [tags] [inlineFields] [date]`。 */
export function serializeInlineMetadata(item: Item): string {
  const parts: string[] = []
  if (item.titleRaw) parts.push(item.titleRaw)
  if (item.metadata.tags?.length) parts.push(item.metadata.tags.join(' '))
  if (item.metadata.inlineFields?.length) {
    parts.push(item.metadata.inlineFields.map(f => `{{${f.key}:: ${f.value}}}`).join(' '))
  }
  const date = serializeDate(item.metadata)
  if (date) parts.push(date)
  return parts.join(' ')
}

/** 提取 `#tag`（含 `#` 前缀）。行首的 `#...` 视为标题，不提取。 */
export function extractTags(raw: string): string[] {
  return findTags(maskSpans(raw, findBraceFields(raw))).map(t => t.tag)
}

/** 提取 inline fields（`{{key:: value}}` 优先，裸 `key:: value` 回退）。 */
export function extractInlineFields(raw: string): InlineField[] {
  const braceFields = findBraceFields(raw)
  const bareFields = findBareFields(maskSpans(raw, braceFields)).filter(f => !f.isDate)
  return [
    ...braceFields.map(f => ({ key: f.key, value: f.value })),
    ...bareFields.map(f => ({ key: f.key, value: f.value })),
  ]
}

/** 识别 `@YYYY-MM-DD` / `@YYYY-MM-DD HH:mm` / `due|start|date:: 日期`。 */
export function parseDateTokens(raw: string): { date?: string; time?: string } {
  const { date, time } = findDateTokens(maskSpans(raw, findBraceFields(raw)))
  const result: { date?: string; time?: string } = {}
  if (date) result.date = date
  if (time) result.time = time
  return result
}

// --- 内部实现 -------------------------------------------------------------

function serializeDate(metadata: ItemMetadata): string {
  if (metadata.date) return `@${metadata.date}${metadata.time ? ` ${metadata.time}` : ''}`
  if (metadata.time) return `@${metadata.time}`
  return ''
}

function findBraceFields(raw: string): FieldSpan[] {
  const out: FieldSpan[] = []
  BRACE_FIELD_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = BRACE_FIELD_RE.exec(raw))) {
    out.push({ key: m[1].trim(), value: m[2].trim(), isDate: false, start: m.index, end: BRACE_FIELD_RE.lastIndex })
  }
  return out
}

function findBareFields(raw: string): FieldSpan[] {
  const out: FieldSpan[] = []
  BARE_FIELD_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = BARE_FIELD_RE.exec(raw))) {
    const key = m[2]
    const value = m[3].trim()
    out.push({
      key,
      value,
      isDate: DATE_KEYWORDS.has(key.toLowerCase()) && DATE_VALUE_RE.test(value),
      start: m.index + m[1].length,
      end: BARE_FIELD_RE.lastIndex,
    })
  }
  return out
}

function findTags(raw: string): TagSpan[] {
  const out: TagSpan[] = []
  TAG_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = TAG_RE.exec(raw))) {
    const hashIndex = m.index + m[1].length
    if (hashIndex === 0) continue // 行首 `#...` 视为标题
    out.push({ tag: `#${m[2]}`, start: hashIndex, end: TAG_RE.lastIndex })
  }
  return out
}

function findDateTokens(raw: string): { date?: string; time?: string; spans: Span[] } {
  const spans: Span[] = []
  let date: string | undefined
  let time: string | undefined

  AT_DATE_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = AT_DATE_RE.exec(raw))) {
    date = date ?? m[1]
    time = time ?? m[2]
    spans.push({ start: m.index, end: AT_DATE_RE.lastIndex })
  }

  KEYWORD_DATE_RE.lastIndex = 0
  while ((m = KEYWORD_DATE_RE.exec(raw))) {
    date = date ?? m[2]
    time = time ?? m[3]
    spans.push({ start: m.index, end: KEYWORD_DATE_RE.lastIndex })
  }

  return { date, time, spans }
}

/** 用等长空格替换 span 区域（保留字符串长度，供后续 span 计算）。 */
function maskSpans(s: string, spans: Span[]): string {
  if (!spans.length) return s
  const chars = s.split('')
  for (const sp of spans) {
    for (let i = sp.start; i < sp.end; i++) chars[i] = ' '
  }
  return chars.join('')
}

function removeSpans(s: string, spans: Span[]): string {
  const sorted = [...spans].sort((a, b) => b.start - a.start)
  let out = s
  for (const sp of sorted) out = out.slice(0, sp.start) + out.slice(sp.end)
  return out
}

function normalizeTitle(s: string): string {
  return s
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

function stripMarkdown(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}
