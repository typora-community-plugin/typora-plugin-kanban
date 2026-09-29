import type { KanbanSettings } from './settings'

/** [laneIndex, itemIndex?] */
export type Path = number[]
export type LaneSort = 'title-asc' | 'title-desc' | 'date-asc' | 'date-desc' | null

export interface InlineField { key: string; value: string }

export interface ItemMetadata {
  /** 'YYYY-MM-DD' */
  date?: string
  /** 'HH:mm' */
  time?: string
  /** 含 `#` 前缀，如 `['#todo/a']` */
  tags?: string[]
  inlineFields?: InlineField[]
}

export interface Item {
  id: string
  checked: boolean
  checkChar: ' ' | 'x' | 'X' | '-'
  /** 原始 markdown（不含 checkbox、不含 metadata token） */
  titleRaw: string
  /** 纯文本（用于搜索 / 编辑回退） */
  title: string
  metadata: ItemMetadata
}

export interface Lane {
  id: string
  /** '## ' 后的原始文本 */
  titleRaw: string
  title: string
  items: Item[]
  shouldMarkItemsComplete?: boolean
  maxItems?: number
  collapsed?: boolean
  sorted?: LaneSort
}

export interface BoardData {
  /** 保留原始 key-value（含未知 key） */
  frontmatter: Record<string, unknown>
  /** 板级覆盖（来自 frontmatter `kanban-settings`） */
  settings: Partial<KanbanSettings>
  archive: Item[]
}

export interface Board {
  /** = 文件绝对路径 */
  id: string
  path: string
  data: BoardData
  lanes: Lane[]
}

/** 生成实例 id：`i_xxxxxxxx` / `l_xxxxxxxx`。 */
export function generateId(prefix: 'i' | 'l'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function createItem(titleRaw = ''): Item {
  return {
    id: generateId('i'),
    checked: false,
    checkChar: ' ',
    titleRaw,
    title: titleRaw,
    metadata: {},
  }
}

export function createLane(titleRaw = ''): Lane {
  return {
    id: generateId('l'),
    titleRaw,
    title: titleRaw,
    items: [],
  }
}
