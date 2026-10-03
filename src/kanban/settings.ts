/**
 * KanbanSettings — 全局/板级设置。
 *
 * 说明：`types.ts` 的 `BoardData.settings` 依赖此类型，故在 Phase 1 一并定义
 *（完整默认值与设置页在 Phase 2.1 / Phase 7 落地）。
 */
export type KanbanViewMode = 'board' | 'list' | 'table'
export type TagAction = 'none' | 'search-board'

export type KanbanSettings = {
  'lane-width': number                     // 单位 rem，默认 17（即 17rem ≈ 272px）
  'show-checkboxes': boolean               // 默认 true
  'hide-card-count': boolean               // 默认 false
  'new-card-insertion-method': 'prepend' | 'append'
  'new-line-trigger': 'enter' | 'shift-enter'
  'date-format': string                    // 'YYYY-MM-DD'
  'date-display-format': string
  'date-color-rules': boolean              // 按 Today/Before/After 给日期着色
  'show-relative-date': boolean
  'move-tags': boolean                     // 标签移到 footer
  'tag-colors': string                     // 每行 `#tag = #rrggbb`
  'tag-sort': string                       // 逗号分隔的标签优先顺序
  'tag-action': TagAction                  // 点击标签行为
  'default-view': KanbanViewMode           // 打开看板时的默认视图
  'archive-with-date': boolean
  'max-archive-size': number               // -1 无限
  'list-collapse': boolean
  'show-search': boolean
  'show-board-settings': boolean
  'auto-open-kanban': boolean               // `*.kanban.md` 自动以看板视图打开
}

/** 所有设置键（用于遍历 / 全局设置快照）。 */
export const kanbanSettingKeys = [
  'lane-width',
  'show-checkboxes',
  'hide-card-count',
  'new-card-insertion-method',
  'new-line-trigger',
  'date-format',
  'date-display-format',
  'date-color-rules',
  'show-relative-date',
  'move-tags',
  'tag-colors',
  'tag-sort',
  'tag-action',
  'default-view',
  'archive-with-date',
  'max-archive-size',
  'list-collapse',
  'show-search',
  'show-board-settings',
  'auto-open-kanban',
] as const satisfies readonly (keyof KanbanSettings)[]

export const defaultSettings: KanbanSettings = {
  'lane-width': 17,
  'show-checkboxes': true,
  'hide-card-count': false,
  'new-card-insertion-method': 'append',
  'new-line-trigger': 'enter',
  'date-format': 'YYYY-MM-DD',
  'date-display-format': 'YYYY-MM-DD',
  'date-color-rules': true,
  'show-relative-date': false,
  'move-tags': false,
  'tag-colors': '',
  'tag-sort': '',
  'tag-action': 'search-board',
  'default-view': 'board',
  'archive-with-date': true,
  'max-archive-size': -1,
  'list-collapse': false,
  'show-search': true,
  'show-board-settings': true,
  'auto-open-kanban': true,
}
