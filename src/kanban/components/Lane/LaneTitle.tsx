import { useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { useKanban } from '../context'
import { c } from '../helpers'
import type { Lane } from '../../types'

/** 列标题：双击编辑；Enter 提交、Esc 取消、blur 提交。 */
export function LaneTitle(props: { lane: Lane; index: number }) {
  const { lane, index } = props
  const { modifiers, editingLaneId, setEditingLaneId } = useKanban()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const handledRef = useRef(false)

  const startEdit = () => {
    setDraft(lane.titleRaw)
    handledRef.current = false
    setEditing(true)
    setEditingLaneId(lane.id)
  }

  useEffect(() => {
    if (editingLaneId === lane.id && !editing) startEdit()
    else if (editing && editingLaneId !== lane.id) setEditing(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLaneId])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commit = () => {
    if (handledRef.current || !editing) return
    handledRef.current = true
    const titleRaw = draft.trim()
    if (titleRaw) modifiers.updateLane([index], { titleRaw, title: titleRaw })
    setEditing(false)
    setEditingLaneId(null)
  }

  const cancel = () => {
    handledRef.current = true
    setEditing(false)
    setEditingLaneId(null)
  }

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
    else if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        class={c('lane-title-input')}
        value={draft}
        onInput={e => setDraft((e.target as HTMLInputElement).value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (!handledRef.current) commit() }}
      />
    )
  }

  return (
    <div class={c('lane-title')} title={lane.titleRaw} onDblClick={startEdit}>
      {lane.titleRaw}
    </div>
  )
}
