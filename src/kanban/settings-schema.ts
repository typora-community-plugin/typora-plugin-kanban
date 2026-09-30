import type { SettingItem } from '@typora-community-plugin/core'
import type { KanbanLocale } from './i18n'
import type { KanbanSettings } from './settings'

export interface SelectOption { label: string; value: string }

export interface SettingControlDef {
  key: keyof KanbanSettings
  label: string
  description?: string
  type: 'checkbox' | 'text' | 'textarea' | 'number' | 'select'
  options?: SelectOption[]
  min?: number
  max?: number
}

export interface SettingGroupDef {
  title: string
  items: SettingControlDef[]
}

/**
 * 全局设置页与板级设置 Modal 共用的设置项定义。
 * 以 `KanbanLocale`（英文 JSON 类型）作为文案来源。
 */
export function getSettingGroups(t: KanbanLocale): SettingGroupDef[] {
  const s = t.setting
  return [
    {
      title: s.groupAppearance,
      items: [
        { key: 'lane-width', label: s.laneWidth, description: s.laneWidthDesc, type: 'number', min: 6, max: 60 },
        { key: 'show-checkboxes', label: s.showCheckboxes, description: s.showCheckboxesDesc, type: 'checkbox' },
        { key: 'hide-card-count', label: s.hideCardCount, description: s.hideCardCountDesc, type: 'checkbox' },
        { key: 'list-collapse', label: s.listCollapse, type: 'checkbox' },
        {
          key: 'default-view',
          label: s.defaultView,
          description: s.defaultViewDesc,
          type: 'select',
          options: [
            { label: t.board.viewBoard, value: 'board' },
            { label: t.board.viewList, value: 'list' },
            { label: t.board.viewTable, value: 'table' },
          ],
        },
        { key: 'show-search', label: s.showSearch, type: 'checkbox' },
        { key: 'show-board-settings', label: s.showBoardSettings, type: 'checkbox' },
      ],
    },
    {
      title: s.groupEditing,
      items: [
        {
          key: 'new-card-insertion-method',
          label: s.newCardInsertionMethod,
          description: s.newCardInsertionMethodDesc,
          type: 'select',
          options: [
            { label: s.optionAppend, value: 'append' },
            { label: s.optionPrepend, value: 'prepend' },
          ],
        },
        {
          key: 'new-line-trigger',
          label: s.newLineTrigger,
          description: s.newLineTriggerDesc,
          type: 'select',
          options: [
            { label: s.optionEnter, value: 'enter' },
            { label: s.optionShiftEnter, value: 'shift-enter' },
          ],
        },
      ],
    },
    {
      title: s.groupDate,
      items: [
        { key: 'date-format', label: s.dateFormat, description: s.dateFormatDesc, type: 'text' },
        { key: 'date-display-format', label: s.dateDisplayFormat, type: 'text' },
        { key: 'date-color-rules', label: s.dateColorRules, description: s.dateColorRulesDesc, type: 'checkbox' },
        { key: 'show-relative-date', label: s.showRelativeDate, description: s.showRelativeDateDesc, type: 'checkbox' },
      ],
    },
    {
      title: s.groupArchive,
      items: [
        { key: 'archive-with-date', label: s.archiveWithDate, description: s.archiveWithDateDesc, type: 'checkbox' },
        { key: 'max-archive-size', label: s.maxArchiveSize, description: s.maxArchiveSizeDesc, type: 'number', min: -1 },
      ],
    },
    {
      title: s.groupTags,
      items: [
        { key: 'move-tags', label: s.moveTags, description: s.moveTagsDesc, type: 'checkbox' },
        { key: 'tag-colors', label: s.tagColors, description: s.tagColorsDesc, type: 'textarea' },
        { key: 'tag-sort', label: s.tagSort, description: s.tagSortDesc, type: 'text' },
        {
          key: 'tag-action',
          label: s.tagAction,
          description: s.tagActionDesc,
          type: 'select',
          options: [
            { label: s.optionTagActionNone, value: 'none' },
            { label: s.optionTagActionSearch, value: 'search-board' },
          ],
        },
      ],
    },
    {
      title: s.groupIntegration,
      items: [
        { key: 'auto-open-kanban-extension', label: s.autoOpenKanbanExtension, description: s.autoOpenKanbanExtensionDesc, type: 'checkbox' },
        { key: 'auto-open', label: s.autoOpen, description: s.autoOpenDesc, type: 'checkbox' },
      ],
    },
  ]
}

/** 将单个设置项渲染到 `SettingItem`（全局 / 板级共用）。 */
export function renderSettingControl(
  setting: SettingItem,
  def: SettingControlDef,
  value: unknown,
  onChange: (value: unknown) => void,
): void {
  setting.addName(def.label)
  if (def.description) setting.addDescription(def.description)

  switch (def.type) {
    case 'checkbox':
      setting.addCheckbox(input => {
        input.checked = !!value
        input.onchange = () => onChange(input.checked)
      })
      break

    case 'number':
      setting.addInput('number', input => {
        input.value = value == null ? '' : String(value)
        if (def.min != null) input.min = String(def.min)
        if (def.max != null) input.max = String(def.max)
        input.onchange = () => onChange(input.value === '' ? value : Number(input.value))
      })
      break

    case 'select':
      setting.addSelect(select => {
        for (const opt of def.options ?? []) {
          const optionEl = document.createElement('option')
          optionEl.value = opt.value
          optionEl.textContent = opt.label
          if (opt.value === String(value)) optionEl.selected = true
          select.append(optionEl)
        }
        select.onchange = () => onChange(select.value)
      })
      break

    case 'textarea':
      setting.addTextArea(input => {
        input.rows = 3
        input.value = value == null ? '' : String(value)
        input.onchange = () => onChange(input.value)
      })
      break

    default:
      setting.addText(input => {
        input.value = value == null ? '' : String(value)
        input.onchange = () => onChange(input.value)
      })
  }
}
