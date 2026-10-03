import { useState } from 'preact/hooks'
import { Notice } from '@typora-community-plugin/core'
import { useKanban } from '../context'
import { c } from '../helpers'
import { DropdownMenu } from '../Menu/DropdownMenu'
import type { DropdownMenuItem } from '../Menu/DropdownMenu'
import { DatePicker } from './DatePicker'
import { TimePicker } from './TimePicker'
import { constructCoordinates } from './picker-utils'
import { setItemDate, setItemTime } from '../../parsers/inline-metadata'
import { confirmDialog } from '../../ui/confirm'
import type { Path } from '../../types'

type PickerKind = 'date' | 'time'

/**
 * 卡片菜单：Date / Time / Delete / Duplicate / Split / Archive。
 *
 * 日期 / 时间菜单项打开 `DatePicker` / `TimePicker` 弹层，选择后经
 * `modifiers.updateItem` 写回卡片 metadata（计划 p4-1 ~ p4-3）。
 */
export function ItemMenu(props: { path: Path }) {
  const { path } = props
  const { stateManager, modifiers, i18n } = useKanban()
  const t = i18n.t
  const [picker, setPicker] = useState<{ kind: PickerKind; x: number; y: number } | null>(null)

  const item = stateManager.board.lanes[path[0]]?.items[path[1]]

  const openPicker = (kind: PickerKind, e?: MouseEvent) => {
    setPicker({ kind, ...constructCoordinates(e, (e?.currentTarget as Element) ?? null) })
  }

  const applyDate = (date?: string) => {
    if (item) modifiers.updateItem(path, { metadata: setItemDate(item.metadata, date) })
    setPicker(null)
  }

  const applyTime = (time?: string) => {
    if (item) modifiers.updateItem(path, { metadata: setItemTime(item.metadata, time) })
    setPicker(null)
  }

  const menuItems: DropdownMenuItem[] = [
    {
      key: 'date',
      label: item?.metadata.date ? t.item.editDate : t.item.addDate,
      icon: 'fa-calendar',
      onClick: e => openPicker('date', e),
    },
    ...(item?.metadata.date
      ? [{
        key: 'time',
        label: item.metadata.time ? t.item.editTime : t.item.addTime,
        icon: 'fa-clock-o',
        onClick: (e?: MouseEvent) => openPicker('time', e),
      }]
      : []),
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
  ]

  return (
    <>
      <DropdownMenu label={t.item.menu} buttonClass={c('item-menu-btn')} items={menuItems} />

      {picker?.kind === 'date' && (
        <DatePicker
          x={picker.x}
          y={picker.y}
          value={item?.metadata.date}
          onChange={applyDate}
          onClose={() => setPicker(null)}
        />
      )}

      {picker?.kind === 'time' && (
        <TimePicker
          x={picker.x}
          y={picker.y}
          value={item?.metadata.time}
          onChange={applyTime}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  )
}
