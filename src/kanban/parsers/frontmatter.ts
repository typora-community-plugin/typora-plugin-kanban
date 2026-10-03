import type { KanbanSettings } from '../../settings/settings'

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>
  body: string
}

type YamlScalar = string | number | boolean | null
export type YamlValue = YamlScalar | YamlValue[] | { [key: string]: YamlValue }

/** 匹配文件开头的 YAML frontmatter（`---\n...\n---\n?`）。 */
const FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

/**
 * 解析 frontmatter。
 * - 未闭合 / 无 frontmatter → `{ frontmatter: {}, body: 全文 }`（降级处理）。
 *
 * 说明：core 未导出 `parseMarkdown` / `parseSimplifiedYAML`，故此处自实现
 * 受限 YAML 子集（string / number / boolean / array / 嵌套对象）。
 */
export function parseFrontmatter(md: string): ParsedFrontmatter {
  const m = FRONTMATTER_RE.exec(md)
  if (!m) return { frontmatter: {}, body: md }
  return {
    frontmatter: parseYaml(m[1]),
    body: md.slice(m[0].length),
  }
}

/** frontmatter → YAML 文本（含 `---` 定界符），按 key 排序输出。空对象返回 `''`。 */
export function stringifyFrontmatter(fm: Record<string, unknown>): string {
  const keys = Object.keys(fm).filter(k => fm[k] !== undefined).sort()
  if (!keys.length) return ''
  const lines: string[] = ['---']
  for (const key of keys) lines.push(...stringifyEntry(key, fm[key], 0))
  lines.push('---')
  return lines.join('\n')
}

/** `kanban-plugin` 是否有值（truthy）。 */
export function hasKanbanFlag(fm: Record<string, unknown>): boolean {
  const v = fm['kanban-plugin']
  return v !== undefined && v !== null && v !== false && v !== ''
}

/** 读取板级覆盖设置 `kanban-settings`。 */
export function extractBoardSettings(fm: Record<string, unknown>): Partial<KanbanSettings> {
  const s = fm['kanban-settings']
  return isPlainObject(s) ? (s as Partial<KanbanSettings>) : {}
}

// --- 内部实现 -------------------------------------------------------------

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isScalar(v: unknown): v is YamlScalar {
  return v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'
}

const KEY_RE = /^([^\s:#][^:]*?)\s*:\s*(.*)$/
const LIST_ITEM_RE = /^\s*-\s+/

function parseYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = text.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const raw = lines[i]
    if (raw.trim() === '' || /^\s*#/.test(raw)) { i++; continue }

    const m = KEY_RE.exec(raw)
    if (!m) { i++; continue }

    const key = m[1].trim().replace(/^["']|["']$/g, '')
    const rest = m[2]

    if (rest !== '') {
      result[key] = parseScalar(rest)
      i++
      continue
    }

    // `key:` → 收集后续缩进行（block）
    const block: string[] = []
    let j = i + 1
    while (j < lines.length && (lines[j].trim() === '' || /^\s/.test(lines[j]))) {
      block.push(lines[j])
      j++
    }
    while (block.length && block[block.length - 1].trim() === '') block.pop()

    result[key] = parseNestedBlock(block)
    i = j
  }
  return result
}

function parseNestedBlock(lines: string[]): YamlValue {
  const nonEmpty = lines.filter(l => l.trim() !== '')
  if (!nonEmpty.length) return ''

  if (LIST_ITEM_RE.test(nonEmpty[0])) {
    return nonEmpty.map(l => {
      const value = l.replace(LIST_ITEM_RE, '')
      const om = KEY_RE.exec(value)
      if (om && om[2] !== '') return { [om[1].trim()]: parseScalar(om[2]) } as YamlValue
      return parseScalar(value)
    })
  }

  const minIndent = Math.min(...nonEmpty.map(l => (/^\s*/.exec(l) as RegExpExecArray)[0].length))
  return parseYaml(lines.map(l => l.slice(minIndent)).join('\n')) as YamlValue
}

function parseScalar(value: string): YamlValue {
  const v = value.trim()

  const arr = /^\[(.*)\]$/.exec(v)
  if (arr) {
    const inner = arr[1].trim()
    return inner === '' ? [] : inner.split(/\s*,\s*/).map(parseScalar)
  }

  const obj = /^\{(.*)\}$/.exec(v)
  if (obj) {
    const result: Record<string, YamlValue> = {}
    for (const pair of obj[1].split(/\s*,\s*/)) {
      const idx = pair.indexOf(':')
      if (idx < 0) continue
      result[pair.slice(0, idx).trim()] = parseScalar(pair.slice(idx + 1))
    }
    return result
  }

  if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1)
  if (v === 'true') return true
  if (v === 'false') return false
  if (v === 'null' || v === '~') return null
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
  return v
}

function stringifyEntry(key: string, value: unknown, indent: number): string[] {
  const pad = '  '.repeat(indent)

  if (Array.isArray(value)) {
    if (!value.length) return [`${pad}${key}: []`]
    if (value.every(isScalar)) {
      return [`${pad}${key}: [${value.map(scalarToYaml).join(', ')}]`]
    }
    const out = [`${pad}${key}:`]
    for (const v of value) {
      if (isPlainObject(v)) {
        const entries = Object.entries(v)
        const [firstKey, firstVal] = entries[0] ?? ['', '']
        out.push(`${pad}- ${firstKey}: ${scalarToYaml(firstVal)}`)
        for (const [k, val] of entries.slice(1)) out.push(...stringifyEntry(k, val, indent + 1))
      } else {
        out.push(`${pad}- ${scalarToYaml(v)}`)
      }
    }
    return out
  }

  if (isPlainObject(value)) {
    const out = [`${pad}${key}:`]
    for (const [k, v] of Object.entries(value)) out.push(...stringifyEntry(k, v, indent + 1))
    return out
  }

  return [`${pad}${key}: ${scalarToYaml(value)}`]
}

function scalarToYaml(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)

  const s = String(value)
  const needQuote =
    s === '' ||
    /^\s|\s$/.test(s) ||
    /[:#[\]{}]/.test(s) ||
    /[\r\n]/.test(s) ||
    /^(true|false|null|~|-?\d+(\.\d+)?)$/i.test(s)
  return needQuote ? JSON.stringify(s) : s
}
