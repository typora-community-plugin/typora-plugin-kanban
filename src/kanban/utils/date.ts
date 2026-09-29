/**
 * 极简日期处理：支持 `YYYY` / `MM` / `DD` / `HH` / `mm` 占位符。
 * 仅用于卡片日期显示 / 归档时间戳等内部场景（不引入 moment）。
 */
export function formatDate(date: Date, format: string): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()).padStart(4, '0'),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
  }
  return format.replace(/YYYY|MM|DD|HH|mm/g, token => map[token] ?? token)
}

/** 解析 `YYYY-MM-DD`（本地时区，仅日期）。 */
export function parseDate(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** 距今天的天数（正数=未来，负数=过去，0=今天）；无法解析返回 `null`。 */
export function daysFromToday(dateStr: string): number | null {
  const target = parseDate(dateStr)
  if (!target) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

/** 今天日期（用于归档时间戳）。 */
export function today(format: string): string {
  return formatDate(new Date(), format)
}
