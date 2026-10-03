import { useEffect, useRef } from 'preact/hooks'
import { useKanban } from '../context'
import { c } from '../helpers'
import { Icon } from '../Icon/Icon'
import { buildTimeArray } from '../../utils/date'
import { useBoundaryPosition } from './picker-utils'

/**
 * 时间选择面板（计划 p3）。
 *
 * 生成 96 个 15 分钟粒度的 `HH:mm` 选项（p3-1），整点加粗、选中项显示 ✓（p3-2），
 * 挂载后把选中项滚动居中（p3-3），支持已有时间预填高亮与点击回调（p3-4）。
 */
export function TimePicker(props: {
  x: number
  y: number
  value?: string
  onChange(time: string | undefined): void
  onClose(): void
}) {
  const { x, y, value, onChange, onClose } = props
  const { i18n } = useKanban()
  const t = i18n.t
  const { ref, style } = useBoundaryPosition(x, y)
  const selectedRef = useRef<HTMLButtonElement | null>(null)
  const options = buildTimeArray()

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' })
  }, [])

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

  return (
    <>
      <div class={c('picker-backdrop')} onClick={onClose} />
      <div
        ref={ref}
        class={[c('picker'), c('time-picker')].join(' ')}
        style={style}
        onDblClick={e => e.stopPropagation()}
      >
        <div class={c('time-picker-list')} role="listbox" aria-label={t.picker.time}>
          {options.map(opt => {
            const selected = opt === value
            const isHour = opt.endsWith(':00')
            return (
              <button
                type="button"
                key={opt}
                ref={selected ? selectedRef : undefined}
                class={[c('time-picker-item'), isHour ? 'is-hour' : '', selected ? 'is-selected' : ''].filter(Boolean).join(' ')}
                role="option"
                aria-selected={selected}
                onClick={() => onChange(opt)}
              >
                <span class={c('time-picker-check')}>{selected ? <Icon name="fa-check" /> : null}</span>
                <span>{opt}</span>
              </button>
            )
          })}
        </div>
        <div class={c('picker-actions')}>
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
