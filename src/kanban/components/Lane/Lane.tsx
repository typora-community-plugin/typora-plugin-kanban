import { useKanban } from '../context'
import { useKanbanSetting } from '../../state-manager'
import { c } from '../helpers'
import { LaneHeader } from './LaneHeader'
import { Item } from '../Item/Item'
import { ItemForm } from '../Item/ItemForm'
import { useDragLane } from '../../dnd/use-drag'
import { itemMatches } from '../../search'
import type { Lane as LaneModel } from '../../types'

/** 单列容器：`lane-wrapper` > `lane` > header + items + item-form。可拖拽排序。 */
export function Lane(props: { lane: LaneModel; index: number; variant?: 'board' | 'list' }) {
  const { lane, index, variant = 'board' } = props
  const { stateManager, searchQuery } = useKanban()
  const laneWidth = useKanbanSetting(stateManager, 'lane-width')
  const drag = useDragLane(lane, index)

  const query = searchQuery.trim().toLowerCase()
  const laneHit = !!query && lane.title.toLowerCase().includes(query)

  const collapsed = !!lane.collapsed
  const wrapperCls = [
    c('lane-wrapper'),
    variant === 'list' ? 'is-list' : '',
    collapsed ? 'collapse-horizontal' : '',
    drag.isDragging ? 'is-dragging' : '',
    drag.dropBefore ? 'is-drop-before' : '',
    drag.dropAfter ? 'is-drop-after' : '',
  ].filter(Boolean).join(' ')

  const laneCls = [
    c('lane'),
    drag.isDroppingItems ? 'is-dropping' : '',
  ].filter(Boolean).join(' ')

  const style = variant === 'list'
    ? { width: '100%', maxWidth: '100%' }
    : { width: `${laneWidth}rem` }

  return (
    <div
      class={wrapperCls}
      style={style}
      data-lane-index={index}
      data-item-count={lane.items.length}
    >
      <div class={laneCls}>
        <LaneHeader lane={lane} index={index} gripProps={drag.gripProps} />
        {!collapsed && (
          <div class={c('lane-items')}>
            {lane.items.map((item, itemIndex) => {
              if (query && !laneHit && !itemMatches(item, searchQuery)) return null
              return <Item key={item.id} item={item} path={[index, itemIndex]} laneId={lane.id} />
            })}
            <ItemForm laneIndex={index} />
          </div>
        )}
      </div>
    </div>
  )
}
