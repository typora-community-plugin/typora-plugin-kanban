import { useKanban } from '../context'
import { c } from '../helpers'
import type { Item, Path } from '../../types'

/**
 * 完成态 checkbox。
 *
 * Phase 4：点击切换 `checked` / `checkChar` 并即时持久化。
 * Phase 5：拖入 `shouldMarkItemsComplete` lane 时自动勾选（在此联动）。
 */
export function ItemCheckbox(props: { item: Item; path: Path }) {
  const { item, path } = props
  const { modifiers } = useKanban()

  const toggle = () => {
    const checked = !item.checked
    const checkChar: Item['checkChar'] = checked
      ? (item.checkChar === ' ' ? 'x' : item.checkChar)
      : ' '
    modifiers.updateItem(path, { checked, checkChar })
  }

  return (
    <input
      class={c('item-checkbox')}
      type="checkbox"
      checked={item.checked}
      onChange={toggle}
      onClick={e => e.stopPropagation()}
      aria-label={item.title}
    />
  )
}
