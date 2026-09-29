import { c } from '../helpers'

/** Font Awesome 图标（由 Typora 提供）。`size` 单位为 rem。 */
export function Icon(props: { name: string; size?: number }) {
  const { name, size } = props
  return (
    <i
      class={['fa', name, c('icon')].join(' ')}
      style={size != null ? { fontSize: `${size}rem` } : undefined}
      aria-hidden="true"
    />
  )
}

/** 拖拽手柄（六点），inline SVG。 */
export function GripIcon() {
  return (
    <svg class={c('grip-icon')} width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
      <circle cx="3" cy="3" r="1.2" />
      <circle cx="7" cy="3" r="1.2" />
      <circle cx="3" cy="8" r="1.2" />
      <circle cx="7" cy="8" r="1.2" />
      <circle cx="3" cy="13" r="1.2" />
      <circle cx="7" cy="13" r="1.2" />
    </svg>
  )
}
