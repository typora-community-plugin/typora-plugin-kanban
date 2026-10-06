import { useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { useKanban } from '../context'
import { useKanbanSetting } from '../../state-manager'
import { c } from '../helpers'
import { parseInlineMetadata } from '../../parsers/inline-metadata'
import { createItem } from '../../types'

/**
 * 列底部「+ Add a card」。
 *
 * 打开即进入「标题 + 内容」合并编辑（单个 textarea）：Enter 换行、Shift+Enter 创建并退出编辑；
 * 插入位置依 `new-card-insertion-method`；内容经 `parseInlineMetadata` 识别 `#tag` / `@date` / `[key:: value]`。
 */
export function ItemForm(props: { laneIndex: number }) {
  const { laneIndex } = props
  const { stateManager, modifiers, i18n } = useKanban()
  const insertionMethod = useKanbanSetting(stateManager, 'new-card-insertion-method')

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const ta = inputRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${ta.scrollHeight}px`
  }

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    resize()
  }, [open])

  const submit = () => {
    const raw = value.trim()
    const parsed = raw ? parseInlineMetadata(raw) : null
    const base = createItem(parsed?.titleRaw ?? '')
    const item = {
      ...base,
      title: parsed?.title ?? '',
      metadata: parsed?.metadata ?? {},
    }
    if (insertionMethod === 'prepend') modifiers.prependItems([laneIndex], [item])
    else modifiers.appendItems([laneIndex], [item])
    setValue('')
    setOpen(false)
  }

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setValue('')
      setOpen(false)
    }
    else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  if (!open) {
    return (
      <button
        class={c('item-form')}
        type="button"
        tabindex={0}
        onClick={() => setOpen(true)}
      >
        {i18n.t.item.addCard}
      </button>
    )
  }

  return (
    <div class={[c('item-form'), 'is-open'].join(' ')}>
      <textarea
        ref={inputRef}
        class={c('item-form-input')}
        rows={1}
        value={value}
        placeholder={i18n.t.item.contentPlaceholder}
        spellcheck={false}
        autocorrect="off"
        autocapitalize="off"
        onInput={e => {
          setValue((e.target as HTMLTextAreaElement).value)
          resize()
        }}
        onKeyDown={onKeyDown}
        onBlur={() => { if (!value.trim()) setOpen(false) }}
      />
    </div>
  )
}
