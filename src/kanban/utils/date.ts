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

/** 相对今天偏移的日期字符串（先加月再加天）。 */
export function offsetDate(days: number, months = 0, format = 'YYYY-MM-DD'): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  d.setDate(d.getDate() + days)
  return formatDate(d, format)
}

/**
 * 生成 `HH:mm` 时间选项（默认每 15 分钟，24h 共 96 项）。
 * 对应计划 p1-3：TimePicker 的候选列表。
 */
export function buildTimeArray(stepMinutes = 15): string[] {
  const pad = (n: number) => String(n).padStart(2, '0')
  const out: string[] = []
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`)
  }
  return out
}
