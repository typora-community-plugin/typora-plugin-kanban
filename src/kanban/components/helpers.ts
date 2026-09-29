const cache = new Map<string, string>()

/** 生成 `typ-kanban-*` 前缀的 class 名：`c('lane','header')` → `typ-kanban-lane-header`。 */
export function c(...parts: string[]): string {
  const key = parts.join('|')
  let cls = cache.get(key)
  if (cls === undefined) {
    cls = 'typ-kanban-' + parts.filter(Boolean).join('-')
    cache.set(key, cls)
  }
  return cls
}
