import { useEffect } from 'preact/hooks'
import { useKanban } from '../context'
import { c } from '../helpers'
import { offsetDate } from '../../utils/date'
import { useBoundaryPosition } from './picker-utils'

/**
 * 日期选择面板（计划 p2）。
 *
 * 采用原生 `<input type="date">`（零依赖，p2-1）：TS 侧仅负责
 * 定位 / 边界翻转（p2-2、p2-3）、已有日期预填（p2-4，通过 `value`）、
 * 以及 Esc / 点击外部关闭（p2-5，组件随父级 `onClose` 卸载即 self-destruct）。
 *
 * 选择日期后立即写回并关闭；`Today` / `Clear` 为快捷操作。
 */
export function DatePicker(props: {
  x: number
  y: number
  value?: string
  onChange(date: string | undefined): void
  onClose(): void
}) {
  const { x, y, value, onChange, onClose } = props
  const { i18n } = useKanban()
  const t = i18n.t
  const { ref, style } = useBoundaryPosition(x, y)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const quickDates = [
    { key: 'today', label: t.picker.today, date: offsetDate(0) },
    { key: 'week', label: t.picker.inAWeek, date: offsetDate(7) },
    { key: 'month', label: t.picker.inAMonth, date: offsetDate(0, 1) },
  ]

  return (
    <>
      <div class={c('picker-backdrop')} onClick={onClose} />
      <div
        ref={ref}
        class={[c('picker'), c('date-picker')].join(' ')}
        style={style}
        onDblClick={e => e.stopPropagation()}
      >
        <input
          type="date"
          class={c('date-picker-input')}
          value={value ?? ''}
          onChange={e => onChange((e.target as HTMLInputElement).value || undefined)}
        />
        <div class={c('picker-actions')}>
          {quickDates.map(q => (
            <button
              key={q.key}
              type="button"
              class={c('picker-btn')}
              onClick={() => onChange(q.date)}
            >
              {q.label}
            </button>
          ))}
          <button
            type="button"
            class={[c('picker-btn'), 'is-danger'].join(' ')}
            onClick={() => onChange(undefined)}
          >
            {t.picker.clear}
          </button>
        </div>
      </div>
    </>
  )
}
