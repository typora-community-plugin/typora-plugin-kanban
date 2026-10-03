import type { I18n } from '@typora-community-plugin/core'
import type I18N from '../locales/lang.en.json'

/** 以英文文案为 source of truth 的 locale 结构（仅类型，无运行时导入）。 */
export type KanbanLocale = typeof I18N

export type KanbanI18n = I18n<KanbanLocale>

/** 简易 `{name}` 插值（core `format` 的本地封装）。 */
export function fmt(template: string, dict: Record<string, string | number>): string {
  return template.replace(/\{([^}]+)\}/g, (raw, name: string) =>
    (dict[name] !== undefined ? String(dict[name]) : raw))
}
