import { useKanban } from '../context'
import { c } from '../helpers'
import { DropdownMenu } from '../Menu/DropdownMenu'
import { confirmDialog } from '../../ui/confirm'
import { fmt } from '../../../i18n'
import type { Lane } from '../../types'

/** 列菜单：Rename / Collapse / Archive cards / Delete list。 */
export function LaneMenu(props: { lane: Lane; index: number }) {
  const { lane, index } = props
  const { modifiers, setEditingLaneId, i18n } = useKanban()
  const t = i18n.t

  return (
    <DropdownMenu
      label={t.item.menu}
      buttonClass={c('lane-menu-btn')}
      items={[
        {
          key: 'rename',
          label: t.lane.rename,
          icon: 'fa-pen',
          onClick: () => setEditingLaneId(lane.id),
        },
        {
          key: 'collapse',
          label: lane.collapsed ? t.lane.expand : t.lane.collapse,
          icon: lane.collapsed ? 'fa-caret-right' : 'fa-caret-down',
          onClick: () => modifiers.updateLane([index], { collapsed: !lane.collapsed }),
        },
        {
          key: 'archive',
          label: t.lane.archiveCards,
          icon: 'fa-archive',
          onClick: async () => {
            if (!lane.items.length) return
            const ok = await confirmDialog({
              title: t.confirm.archiveCardsTitle,
              message: fmt(t.confirm.archiveCardsMessage, { count: lane.items.length, lane: lane.titleRaw }),
              confirmText: t.confirm.archive,
              cancelText: t.confirm.cancel,
            })
            if (ok) modifiers.archiveLaneItems([index])
          },
        },
        {
          key: 'delete',
          label: t.lane.deleteList,
          icon: 'fa-trash',
          danger: true,
          onClick: async () => {
            const ok = await confirmDialog({
              title: t.confirm.deleteListTitle,
              message: fmt(t.confirm.deleteListMessage, { lane: lane.titleRaw }),
              confirmText: t.confirm.delete,
              cancelText: t.confirm.cancel,
            })
            if (ok) modifiers.deleteLane([index])
          },
        },
      ]}
    />
  )
}
