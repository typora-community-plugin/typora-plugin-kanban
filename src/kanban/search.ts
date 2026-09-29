import type { Item, Lane } from './types'

/** 卡片是否命中查询（title / tags / inline fields / date，大小写不敏感）。 */
export function itemMatches(item: Item, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true

  if (item.title.toLowerCase().includes(q)) return true
  if (item.metadata.date?.toLowerCase().includes(q)) return true

  for (const tag of item.metadata.tags ?? []) {
    if (tag.toLowerCase().includes(q)) return true
  }
  for (const field of item.metadata.inlineFields ?? []) {
    if (field.key.toLowerCase().includes(q) || field.value.toLowerCase().includes(q)) return true
  }
  return false
}

/** 列是否可见：列标题命中，或任一卡片命中。 */
export function laneMatches(lane: Lane, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (lane.title.toLowerCase().includes(q)) return true
  return lane.items.some(item => itemMatches(item, q))
}
