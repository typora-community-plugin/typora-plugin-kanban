import { useMemo } from 'preact/hooks'
import { useKanban } from '../context'
import { c } from '../helpers'
import { ItemCheckbox } from '../Item/ItemCheckbox'
import { ItemContent } from '../Item/ItemContent'
import { ItemMenu } from '../Item/ItemMenu'
import { itemMatches, laneMatches } from '../../search'
import type { Board, Item, Lane } from '../../types'

interface TableRow { lane: Lane; laneIndex: number; item: Item; itemIndex: number }

/** Table View：卡片扁平化，列 = Card / List / Date / Tags (+ 各 inline field)。 */
export function TableView(props: { board: Board }) {
  const { board } = props
  const { i18n, searchQuery } = useKanban()
  const t = i18n.t

  // 各 inline field 的动态列。
  const fieldKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const lane of board.lanes) {
      for (const item of lane.items) {
        for (const field of item.metadata.inlineFields ?? []) keys.add(field.key)
      }
    }
    return [...keys]
  }, [board])

  const rows = useMemo<TableRow[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    const out: TableRow[] = []
    board.lanes.forEach((lane, laneIndex) => {
      if (!laneMatches(lane, searchQuery)) return
      const laneHit = !!q && lane.title.toLowerCase().includes(q)
      lane.items.forEach((item, itemIndex) => {
        if (q && !laneHit && !itemMatches(item, searchQuery)) return
        out.push({ lane, laneIndex, item, itemIndex })
      })
    })
    return out
  }, [board, searchQuery])

  return (
    <div class={c('table-wrapper')}>
      <table class={c('table')}>
        <thead>
          <tr>
            <th class={c('table-col-card')}>{t.table.card}</th>
            <th>{t.table.lane}</th>
            <th>{t.table.date}</th>
            <th>{t.table.tags}</th>
            {fieldKeys.map(key => <th key={key}>{key}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ lane, laneIndex, item, itemIndex }) => {
            const path = [laneIndex, itemIndex]
            return (
              <tr key={item.id} class={item.checked ? 'is-checked' : ''}>
                <td class={c('table-card')}>
                  <ItemCheckbox item={item} path={path} />
                  <ItemContent item={item} path={path} hideMetadata />
                  <ItemMenu path={path} />
                </td>
                <td class={c('table-lane')}>{lane.titleRaw}</td>
                <td>{item.metadata.date ?? ''}</td>
                <td>{(item.metadata.tags ?? []).join(' ')}</td>
                {fieldKeys.map(key => (
                  <td key={key}>
                    {(item.metadata.inlineFields ?? []).find(f => f.key === key)?.value ?? ''}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
