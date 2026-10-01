import { c } from '../helpers'
import { useKanban } from '../context'
import { ItemCheckbox } from './ItemCheckbox'
import { ItemContent } from './ItemContent'
import { ItemMenu } from './ItemMenu'
import { useDragItem } from '../../dnd/use-drag'
import { useKanbanSetting } from '../../state-manager'
import type { Item as ItemModel, Path } from '../../types'

/** 单卡片：`item-wrapper` > `item` > checkbox + content + menu（整卡可按压拖拽）。 */
export function Item(props: { item: ItemModel; path: Path; laneId: string }) {
  const { item, path, laneId } = props
  const { editingItemId, stateManager } = useKanban()
  const [laneIndex, itemIndex] = path
  const drag = useDragItem(path, laneId)
  const showCheckboxes = useKanbanSetting(stateManager, 'show-checkboxes')

  const wrapperCls = [
    c('item-wrapper'),
    drag.dropBefore ? 'is-drop-before' : '',
    drag.dropAfter ? 'is-drop-after' : '',
  ].filter(Boolean).join(' ')

  const itemCls = [
    c('item'),
    item.checked ? 'is-checked' : '',
    drag.isDragging ? 'is-dragging' : '',
    editingItemId === item.id ? 'is-editing' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      class={wrapperCls}
      data-lane-index={laneIndex}
      data-item-index={itemIndex}
    >
      <div class={itemCls} onMouseDown={drag.onMouseDown}>
        <ItemCheckbox item={item} path={path} showCheckboxes={showCheckboxes} />
        <ItemContent item={item} path={path} />
        <ItemMenu path={path} />
      </div>
    </div>
  )
}
