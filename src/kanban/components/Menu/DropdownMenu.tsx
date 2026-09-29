import { useEffect, useState } from 'preact/hooks'
import { c } from '../helpers'
import { Icon } from '../Icon/Icon'

export interface DropdownMenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
  onClick(): void
}

/**
 * 自绘下拉菜单（core 未导出 `Menu`）。
 *
 * 列表使用 `position: fixed` 定位，避免被 `.typ-kanban-lane-items` 的
 * `overflow: auto` 裁剪；滚动 / 缩放 / Esc 时自动关闭。
 */
export function DropdownMenu(props: {
  items: DropdownMenuItem[]
  label: string
  buttonClass?: string
  icon?: string
}) {
  const { items, label, buttonClass, icon = 'fa-ellipsis-v' } = props
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  const toggle = (e: MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: Math.max(4, rect.right - 140) })
    setOpen(v => !v)
  }

  const run = (item: DropdownMenuItem) => {
    setOpen(false)
    item.onClick()
  }

  return (
    <div class={c('menu')}>
      <button
        class={[c('menu-btn'), buttonClass].filter(Boolean).join(' ')}
        type="button"
        tabindex={0}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        <Icon name={icon} />
      </button>

      {open && (
        <>
          <div class={c('menu-backdrop')} onClick={() => setOpen(false)} />
          <ul
            class={c('menu-list')}
            role="menu"
            style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
          >
            {items.map(item => (
              <li
                key={item.key}
                class={[c('menu-item'), item.danger ? 'is-danger' : ''].filter(Boolean).join(' ')}
                role="menuitem"
                tabindex={0}
                onClick={() => run(item)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    run(item)
                  }
                }}
              >
                {item.icon && <Icon name={item.icon} />}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
