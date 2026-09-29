import { Notice } from '@typora-community-plugin/core'
import { useKanban } from '../context'
import { c } from '../helpers'
import { DropdownMenu } from '../Menu/DropdownMenu'
import { confirmDialog } from '../../ui/confirm'
import type { Path } from '../../types'

/** 卡片菜单：Delete / Duplicate / Split / Archive（破坏性操作二次确认）。 */
export function ItemMenu(props: { path: Path }) {
  const { path } = props
  const { stateManager, modifiers, i18n } = useKanban()
  const t = i18n.t

  return (
    <DropdownMenu
      label={t.item.menu}
      buttonClass={c('item-menu-btn')}
      items={[
        {
          key: 'delete',
          label: t.item.deleteCard,
          icon: 'fa-trash',
          danger: true,
          onClick: async () => {
            const ok = await confirmDialog({
              title: t.confirm.deleteCardTitle,
              message: t.confirm.deleteCardMessage,
              confirmText: t.confirm.delete,
              cancelText: t.confirm.cancel,
            })
            if (ok) modifiers.deleteItem(path)
          },
        },
        {
          key: 'duplicate',
          label: t.item.duplicateCard,
          icon: 'fa-clone',
          onClick: () => modifiers.duplicateItem(path),
        },
        {
          key: 'split',
          label: t.item.splitCard,
          icon: 'fa-scissors',
          onClick: () => {
            const item = stateManager.board.lanes[path[0]]?.items[path[1]]
            if (!item || !item.titleRaw.includes('\n')) {
              new Notice(t.notice.nothingToSplit)
              return
            }
            modifiers.splitItem(path)
          },
        },
        {
          key: 'archive',
          label: t.item.archiveCard,
          icon: 'fa-archive',
          onClick: async () => {
            const ok = await confirmDialog({
              title: t.confirm.archiveCardTitle,
              message: t.confirm.archiveCardMessage,
              confirmText: t.confirm.archive,
              cancelText: t.confirm.cancel,
            })
            if (ok) modifiers.archiveItem(path)
          },
        },
      ]}
    />
  )
}
