import { SettingTab, type PluginSettings } from '@typora-community-plugin/core'
import type { KanbanI18n } from '../i18n'
import type { KanbanSettings } from './settings'
import { getSettingGroups, renderSettingControl } from './settings-schema'

export interface KanbanSettingsHost {
  settings: PluginSettings<KanbanSettings>
  i18n: KanbanI18n
}

/** 全局设置页（外观 / 编辑 / 日期 / 归档 / 标签 / 集成）。 */
export class KanbanSettingTab extends SettingTab {

  constructor(private host: KanbanSettingsHost) {
    super()
  }

  get name() {
    return 'Kanban'
  }

  onload() {
    const { settings, i18n } = this.host

    for (const group of getSettingGroups(i18n.t)) {
      this.addSettingTitle(group.title)

      for (const def of group.items) {
        this.addSetting(setting => {
          renderSettingControl(setting, def, settings.get(def.key), value => {
            settings.set(def.key, value)
          })
        })
      }
    }
  }
}
