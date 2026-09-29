import { useEffect, useRef, useState } from 'preact/hooks'
import type { JSX } from 'preact'
import { useKanban } from '../context'
import { useKanbanSetting } from '../../state-manager'
import { c } from '../helpers'
import { createLane } from '../../types'

/** 看板「+ Add a list」；空板时自动展开并聚焦；`forceOpen` 供命令触发。 */
export function LaneForm(props: {
  autoFocus?: boolean
  forceOpen?: boolean
  onForceOpenHandled?: () => void
  variant?: 'board' | 'list'
}) {
  const { autoFocus, forceOpen, onForceOpenHandled, variant = 'board' } = props
  const { stateManager, modifiers, i18n } = useKanban()
  const laneWidth = useKanbanSetting(stateManager, 'lane-width')

  const [open, setOpen] = useState(!!autoFocus)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!forceOpen) return
    setOpen(true)
    onForceOpenHandled?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceOpen])

  const submit = () => {
    const title = value.trim()
    if (title) modifiers.addLane(createLane(title))
    setValue('')
    setOpen(false)
  }

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
    else if (e.key === 'Escape') {
      e.preventDefault()
      setValue('')
      setOpen(false)
    }
  }

  return (
    <div
      class={[c('lane-form-wrapper'), variant === 'list' ? 'is-list' : ''].filter(Boolean).join(' ')}
      style={variant === 'list' ? { width: '100%' } : { width: `${laneWidth}rem` }}
    >
      {!open ? (
        <button
          class={[c('lane-form'), 'is-empty'].join(' ')}
          type="button"
          tabindex={0}
          onClick={() => setOpen(true)}
        >
          {i18n.t.lane.addList}
        </button>
      ) : (
        <div class={[c('lane-form'), 'is-open'].join(' ')}>
          <input
            ref={inputRef}
            class={c('lane-form-input')}
            value={value}
            placeholder={i18n.t.lane.titlePlaceholder}
            onInput={e => setValue((e.target as HTMLInputElement).value)}
            onKeyDown={onKeyDown}
            onBlur={() => { if (!value.trim()) setOpen(false) }}
          />
        </div>
      )}
    </div>
  )
}
