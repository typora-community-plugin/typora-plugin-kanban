import { useEffect, useMemo, useState } from 'preact/hooks'
import { KanbanContext, type KanbanContextValue } from './context'
import { c } from './helpers'
import { createBoardModifiers } from '../board-modifiers'
import { useStateManager, type KanbanStateManager } from '../state-manager'
import { Lane } from './Lane/Lane'
import { LaneForm } from './Lane/LaneForm'
import { ListView } from './ListView/ListView'
import { TableView } from './Table/TableView'
import { BoardHeader } from './BoardHeader/BoardHeader'
import { confirmDialog } from '../ui/confirm'
import { laneMatches } from '../search'
import { dragStore } from '../dnd/drag-store'
import type { KanbanI18n } from '../../i18n'
import type { KanbanViewMode } from '../../settings/settings'

/**
 * 根组件。
 *
 * Phase 6：搜索过滤 + 高亮、归档。
 * Phase 8：Header 工具条 + 视图级动作注册。
 * Phase 11：Board / List / Table 三种视图切换。
 */
export function Kanban(props: { stateManager: KanbanStateManager; i18n: KanbanI18n }) {
  const { stateManager, i18n } = props
  const board = useStateManager(stateManager)
  const modifiers = useMemo(() => createBoardModifiers(stateManager), [stateManager])

  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingLaneId, setEditingLaneId] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [laneFormOpen, setLaneFormOpen] = useState(false)
  const [viewMode, setViewMode] = useState<KanbanViewMode>(() => stateManager.getSetting('default-view'))

  const openSearch = (query: string) => {
    setSearchInput(query)
    setSearchOpen(true)
  }

  // 输入即时响应，过滤 / 高亮 debounce 250ms。
  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput), 250)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const ctx = useMemo<KanbanContextValue>(() => ({
    stateManager,
    modifiers,
    i18n,
    editingItemId,
    setEditingItemId,
    editingLaneId,
    setEditingLaneId,
    searchQuery,
    search: openSearch,
    viewMode,
    setViewMode,
  }), [stateManager, modifiers, i18n, editingItemId, editingLaneId, searchQuery, viewMode])

  // 卸载时清理可能残留的拖拽状态 / 浮层。
  useEffect(() => () => dragStore.reset(), [])

  const archiveAll = async () => {
    const count = board.lanes.reduce((sum, lane) => sum + (
      lane.shouldMarkItemsComplete
        ? lane.items.length
        : lane.items.filter(item => item.checked).length
    ), 0)
    if (!count) return

    const t = i18n.t
    const ok = await confirmDialog({
      title: t.confirm.archiveAllTitle,
      message: t.confirm.archiveAllMessage,
      confirmText: t.confirm.archive,
    })
    if (ok) modifiers.archiveAllCompleted()
  }

  // 命令 / Header 触发的视图级动作。
  useEffect(() => {
    const offAdd = stateManager.registerAction('add-lane', () => setLaneFormOpen(true))
    const offSearch = stateManager.registerAction('open-search', () => setSearchOpen(true))
    const offArchive = stateManager.registerAction('archive-all', () => { void archiveAll() })
    const offViewBoard = stateManager.registerAction('view-board', () => setViewMode('board'))
    const offViewList = stateManager.registerAction('view-list', () => setViewMode('list'))
    const offViewTable = stateManager.registerAction('view-table', () => setViewMode('table'))
    return () => {
      offAdd(); offSearch(); offArchive()
      offViewBoard(); offViewList(); offViewTable()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateManager, board])

  const searching = searchQuery.trim().length > 0
  const visibleLanes = board.lanes
    .map((lane, index) => ({ lane, index }))
    .filter(({ lane }) => laneMatches(lane, searchQuery))

  return (
    <KanbanContext.Provider value={ctx}>
      <div class={c('container')}>
        <BoardHeader
          searchOpen={searchOpen}
          searchQuery={searchInput}
          onToggleSearch={() => setSearchOpen(open => !open)}
          onSearchQuery={setSearchInput}
          onAddList={() => setLaneFormOpen(true)}
          onArchiveAll={archiveAll}
          view={viewMode}
          onViewChange={setViewMode}
        />

        {viewMode === 'table' ? (
          <TableView board={board} />
        ) : viewMode === 'list' ? (
          <ListView
            board={board}
            laneFormOpen={laneFormOpen}
            onLaneFormHandled={() => setLaneFormOpen(false)}
          />
        ) : (
          <div class={c('board')}>
            {visibleLanes.map(({ lane, index }) => (
              <Lane key={lane.id} lane={lane} index={index} />
            ))}
            <LaneForm
              autoFocus={!searching && board.lanes.length === 0}
              forceOpen={laneFormOpen}
              onForceOpenHandled={() => setLaneFormOpen(false)}
            />
          </div>
        )}
      </div>
    </KanbanContext.Provider>
  )
}
