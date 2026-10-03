import { useEffect, useRef } from 'preact/hooks'
import type { JSX } from 'preact'
import { useKanban } from '../context'
import { useKanbanSetting } from '../../state-manager'
import { c } from '../helpers'
import { Icon } from '../Icon/Icon'
import { DropdownMenu } from '../Menu/DropdownMenu'
import { openBoardSettingsModal } from '../../ui/board-settings-modal'
import type { KanbanViewMode } from '../../../settings/settings'

export interface BoardHeaderProps {
  searchOpen: boolean
  searchQuery: string
  onToggleSearch(): void
  onSearchQuery(query: string): void
  onAddList(): void
  onArchiveAll(): void
  view: KanbanViewMode
  onViewChange(view: KanbanViewMode): void
}

/** 板级工具条：Add list / Search / View / Archive all / View as Markdown / Board settings。 */
export function BoardHeader(props: BoardHeaderProps) {
  const {
    searchOpen, searchQuery,
    onToggleSearch, onSearchQuery, onAddList, onArchiveAll,
    view, onViewChange,
  } = props

  const { stateManager, i18n } = useKanban()
  const showSearch = useKanbanSetting(stateManager, 'show-search')
  const showBoardSettings = useKanbanSetting(stateManager, 'show-board-settings')
  const t = i18n.t

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  const onSearchKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onSearchQuery('')
      onToggleSearch()
    }
  }

  return (
    <div class={c('board-header')}>
      <button
        class={[c('btn'), c('board-header-btn')].join(' ')}
        type="button"
        tabindex={0}
        onClick={onAddList}
      >
        <Icon name="fa-plus" />
        <span>{t.board.addList}</span>
      </button>

      {showSearch && (
        <div class={[c('search'), searchOpen ? 'is-open' : ''].filter(Boolean).join(' ')}>
          {!searchOpen ? (
            <button
              class={[c('btn'), c('board-header-btn')].join(' ')}
              type="button"
              tabindex={0}
              aria-label={t.board.search}
              onClick={onToggleSearch}
            >
              <Icon name="fa-search" />
            </button>
          ) : (
            <>
              <Icon name="fa-search" />
              <input
                ref={inputRef}
                class={c('search-input')}
                type="search"
                value={searchQuery}
                placeholder={t.board.searchPlaceholder}
                onInput={e => onSearchQuery((e.target as HTMLInputElement).value)}
                onKeyDown={onSearchKeyDown}
              />
              <button
                class={c('search-clear')}
                type="button"
                tabindex={0}
                aria-label={t.board.clearSearch}
                onClick={() => { onSearchQuery(''); onToggleSearch() }}
              >
                <Icon name="fa-times" />
              </button>
            </>
          )}
        </div>
      )}

      <DropdownMenu
        label={t.board.viewAs}
        icon="fa-th-large"
        buttonClass={c('board-header-btn')}
        items={[
          { key: 'board', label: `${view === 'board' ? '✓ ' : ''}${t.board.viewBoard}`, icon: 'fa-columns', onClick: () => onViewChange('board') },
          { key: 'list', label: `${view === 'list' ? '✓ ' : ''}${t.board.viewList}`, icon: 'fa-list', onClick: () => onViewChange('list') },
          { key: 'table', label: `${view === 'table' ? '✓ ' : ''}${t.board.viewTable}`, icon: 'fa-table', onClick: () => onViewChange('table') },
        ]}
      />

      <span class={c('board-header-spacer')} />

      <button
        class={[c('btn'), c('board-header-btn')].join(' ')}
        type="button"
        tabindex={0}
        title={t.board.archiveAll}
        onClick={onArchiveAll}
      >
        <Icon name="fa-archive" />
      </button>

      <button
        class={[c('btn'), c('board-header-btn')].join(' ')}
        type="button"
        tabindex={0}
        title={t.board.viewAsMarkdown}
        onClick={() => stateManager.runAction('view-as-markdown')}
      >
        <Icon name="fa-file-text-o" />
      </button>

      {showBoardSettings && (
        <button
          class={[c('btn'), c('board-header-btn')].join(' ')}
          type="button"
          tabindex={0}
          title={t.board.settings}
          onClick={() => openBoardSettingsModal(stateManager, i18n)}
        >
          <Icon name="fa-cog" />
        </button>
      )}
    </div>
  )
}
