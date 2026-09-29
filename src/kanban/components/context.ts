import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { KanbanStateManager } from '../state-manager'
import type { BoardModifiers } from '../board-modifiers'
import type { KanbanI18n } from '../i18n'
import type { KanbanViewMode } from '../settings'

export interface KanbanContextValue {
  stateManager: KanbanStateManager
  modifiers: BoardModifiers
  i18n: KanbanI18n
  /** 正在编辑标题的 item id（含新建卡片自动进入编辑）。 */
  editingItemId: string | null
  setEditingItemId(id: string | null): void
  /** 正在编辑标题的 lane id。 */
  editingLaneId: string | null
  setEditingLaneId(id: string | null): void
  /** 当前搜索查询（用于过滤与高亮）。 */
  searchQuery: string
  /** 触发看板内搜索（打开搜索框并填入查询）。 */
  search(query: string): void
  /** 当前视图模式。 */
  viewMode: KanbanViewMode
  setViewMode(mode: KanbanViewMode): void
}

export const KanbanContext = createContext<KanbanContextValue | null>(null)

export function useKanban(): KanbanContextValue {
  const ctx = useContext(KanbanContext)
  if (!ctx) throw new Error('[kanban] KanbanContext is not provided')
  return ctx
}
