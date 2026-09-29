import { useKanban } from '../context'
import { c } from '../helpers'
import { Lane } from '../Lane/Lane'
import { LaneForm } from '../Lane/LaneForm'
import { laneMatches } from '../../search'
import type { Board } from '../../types'

/** List View：列表（Lane）垂直堆叠，可折叠、可拖拽排序。 */
export function ListView(props: { board: Board; laneFormOpen: boolean; onLaneFormHandled(): void }) {
  const { board, laneFormOpen, onLaneFormHandled } = props
  const { searchQuery } = useKanban()
  const searching = searchQuery.trim().length > 0

  const visibleLanes = board.lanes
    .map((lane, index) => ({ lane, index }))
    .filter(({ lane }) => laneMatches(lane, searchQuery))

  return (
    <div class={c('list')}>
      {visibleLanes.map(({ lane, index }) => (
        <Lane key={lane.id} lane={lane} index={index} variant="list" />
      ))}
      <LaneForm
        variant="list"
        autoFocus={!searching && board.lanes.length === 0}
        forceOpen={laneFormOpen}
        onForceOpenHandled={onLaneFormHandled}
      />
    </div>
  )
}
