import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { useKanban } from '../context'
import { useKanbanSetting } from '../../state-manager'
import { c } from '../helpers'
import { Highlight } from '../search/Highlight'
import { parseInlineMetadata, serializeInlineMetadata } from '../../parsers/inline-metadata'
import { daysFromToday, formatDate, parseDate } from '../../utils/date'
import { parseTagColors, parseTagSort, sortTags, tagStyle } from '../../utils/tags'
import { fmt } from '../../i18n'
import type { Item, Path } from '../../types'

/**
 * 卡片内容：标题 + 元数据行（日期 / tags / inline fields）。
 *
 * 双击进入编辑态：独立 `<textarea>`（自动高度）；
 * Enter / Shift+Enter 的「换行 vs 提交」由 `new-line-trigger` 决定，Esc 取消，blur 提交。
 *
 * Phase 11：日期着色 / 相对日期、标签颜色 / 排序 / 点击行为；`hideMetadata` 供表格视图复用。
 */
export function ItemContent(props: { item: Item; path: Path; hideMetadata?: boolean }) {
  const { item, path, hideMetadata } = props
  const { stateManager, modifiers, i18n, editingItemId, setEditingItemId, searchQuery, search } = useKanban()
  const moveTags = useKanbanSetting(stateManager, 'move-tags')
  const newLineTrigger = useKanbanSetting(stateManager, 'new-line-trigger')
  const showRelativeDate = useKanbanSetting(stateManager, 'show-relative-date')
  const dateColorRules = useKanbanSetting(stateManager, 'date-color-rules')
  const dateDisplayFormat = useKanbanSetting(stateManager, 'date-display-format')
  const tagColorsRaw = useKanbanSetting(stateManager, 'tag-colors')
  const tagSortRaw = useKanbanSetting(stateManager, 'tag-sort')
  const tagAction = useKanbanSetting(stateManager, 'tag-action')

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const handledRef = useRef(false)

  const tagColorMap = useMemo(() => parseTagColors(tagColorsRaw), [tagColorsRaw])
  const tagOrder = useMemo(() => parseTagSort(tagSortRaw), [tagSortRaw])

  const startEdit = () => {
    setDraft(serializeInlineMetadata(item))
    handledRef.current = false
    setEditing(true)
    setEditingItemId(item.id)
  }

  // 外部（新建卡片 / 菜单）请求进入编辑。
  useEffect(() => {
    if (editingItemId === item.id && !editing) startEdit()
    else if (editing && editingItemId !== item.id) setEditing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingItemId])

  const resize = () => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }

  useEffect(() => {
    if (!editing) return
    const ta = taRef.current
    if (!ta) return
    ta.focus()
    const len = ta.value.length
    ta.setSelectionRange(len, len)
    resize()
  }, [editing])

  const commit = () => {
    if (handledRef.current || !editing) return
    handledRef.current = true
    const parsed = parseInlineMetadata(draft)
    modifiers.updateItem(path, {
      titleRaw: parsed.titleRaw,
      title: parsed.title,
      metadata: parsed.metadata,
    })
    setEditing(false)
    setEditingItemId(null)
  }

  const cancel = () => {
    handledRef.current = true
    setEditing(false)
    setEditingItemId(null)
  }

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
      return
    }
    if (e.key !== 'Enter') return
    // `new-line-trigger` 指定「插入换行」的组合；另一组合用于提交。
    const newlineOnEnter = newLineTrigger === 'enter'
    const insertNewline = newlineOnEnter ? !e.shiftKey : e.shiftKey
    if (insertNewline) return
    e.preventDefault()
    commit()
  }

  if (editing) {
    return (
      <div class={c('item-content')}>
        <textarea
          ref={taRef}
          class={c('item-title-input')}
          value={draft}
          rows={1}
          onInput={e => {
            setDraft((e.target as HTMLTextAreaElement).value)
            resize()
          }}
          onKeyDown={onKeyDown}
          onBlur={() => { if (!handledRef.current) commit() }}
        />
      </div>
    )
  }

  const { date, tags = [], inlineFields = [] } = item.metadata

  const orderedTags = sortTags(tags, tagOrder)
  const hasInlineMeta = !!date || inlineFields.length > 0
  const metaTags = moveTags || hideMetadata ? [] : orderedTags

  const renderTag = (tag: string) => {
    const style = tagStyle(tag, tagColorMap)
    const clickable = tagAction !== 'none'
    return (
      <span
        class={[c('item-metadata-tag'), clickable ? 'is-clickable' : ''].filter(Boolean).join(' ')}
        key={tag}
        style={style ?? undefined}
        role={clickable ? 'button' : undefined}
        tabindex={clickable ? 0 : undefined}
        onClick={clickable ? (e: MouseEvent) => { e.stopPropagation(); search(tag) } : undefined}
        onKeyDown={clickable ? (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); search(tag) }
        } : undefined}
      >
        <Highlight text={tag} query={searchQuery} />
      </span>
    )
  }

  let dateText = date ?? ''
  let dateCls = ''
  if (date) {
    const diff = daysFromToday(date)
    if (diff != null) {
      if (showRelativeDate) {
        const d = i18n.t.date
        dateText = diff === 0 ? d.today
          : diff === 1 ? d.tomorrow
            : diff === -1 ? d.yesterday
              : diff > 0 ? fmt(d.inDays, { count: diff })
                : fmt(d.daysAgo, { count: -diff })
      } else if (dateDisplayFormat && dateDisplayFormat !== 'YYYY-MM-DD') {
        const parsed = parseDate(date)
        if (parsed) dateText = formatDate(parsed, dateDisplayFormat)
      }
      if (dateColorRules) {
        dateCls = diff < 0 ? 'is-date-before' : diff > 0 ? 'is-date-after' : 'is-date-today'
      }
    }
  }

  return (
    <div class={c('item-content')} onDblClick={startEdit}>
      <div class={c('item-title')}><Highlight text={item.title} query={searchQuery} /></div>

      {!hideMetadata && (hasInlineMeta || metaTags.length > 0) && (
        <div class={c('item-metadata')}>
          {date && (
            <span class={[c('item-metadata-date'), dateCls].filter(Boolean).join(' ')}>{dateText}</span>
          )}
          {metaTags.map(renderTag)}
          {inlineFields.map(field => (
            <span class={c('item-metadata-field')} key={field.key}>
              {field.key}: {field.value}
            </span>
          ))}
        </div>
      )}

      {!hideMetadata && moveTags && orderedTags.length > 0 && (
        <div class={[c('item-metadata'), c('item-metadata-footer')].join(' ')}>
          {orderedTags.map(renderTag)}
        </div>
      )}
    </div>
  )
}
