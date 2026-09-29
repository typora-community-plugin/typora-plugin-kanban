import { useKanban } from '../context'
import { useKanbanSetting } from '../../state-manager'
import { c } from '../helpers'
import { GripIcon, Icon } from '../Icon/Icon'
import { LaneTitle } from './LaneTitle'
import { LaneMenu } from './LaneMenu'
import type { DragGripProps } from '../../dnd/use-drag'
import type { Lane } from '../../types'

/** 列头：grip + 折叠按钮 + 标题 + 计数徽标 + 菜单。grip 为拖拽 handle。 */
export function LaneHeader(props: { lane: Lane; index: number; gripProps: DragGripProps }) {
  const { lane, index, gripProps } = props
  const { stateManager, modifiers, i18n } = useKanban()
  const hideCardCount = useKanbanSetting(stateManager, 'hide-card-count')
  const collapsed = !!lane.collapsed

  return (
    <div class={c('lane-header')}>
      <span class={c('lane-header-grip')} title={i18n.t.lane.dragToReorder} {...gripProps}><GripIcon /></span>
      <button
        class={c('lane-collapse-btn')}
        type="button"
        tabindex={0}
        aria-label={collapsed ? i18n.t.lane.expand : i18n.t.lane.collapse}
        onClick={() => modifiers.updateLane([index], { collapsed: !collapsed })}
      >
        <Icon name={collapsed ? 'fa-caret-right' : 'fa-caret-down'} />
      </button>
      <LaneTitle lane={lane} index={index} />
      {!hideCardCount && (
        <span class={c('lane-count')}>{lane.items.length}</span>
      )}
      <span class={c('lane-header-spacer')} />
      <LaneMenu lane={lane} index={index} />
    </div>
  )
}
