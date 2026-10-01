import { Modal, SettingItem } from '@typora-community-plugin/core'
import type { KanbanI18n } from '../i18n'
import type { KanbanStateManager } from '../state-manager'
import { getSettingGroups, renderSettingControl } from '../settings-schema'

/**
 * 板级设置 Modal。
 *
 * 复用全局设置项定义（`settings-schema`），但写回 `board.data.settings`
 * （序列化到 frontmatter `kanban-settings`），优先级高于全局设置。
 */
export function openBoardSettingsModal(stateManager: KanbanStateManager, i18n: KanbanI18n): void {
  const modal = new Modal({ className: 'typ-kanban-board-settings' })
  modal.setHeader(i18n.t.setting.boardSettingsTitle)

  modal.setBody(body => {
    body.classList.add('typ-kanban-board-settings-body')

    for (const group of getSettingGroups(i18n.t)) {
      const title = document.createElement('h3')
      title.className = 'typ-setting-title'
      title.textContent = group.title
      body.append(title)

      for (const def of group.items) {
        const item = new SettingItem()
        renderSettingControl(item, def, stateManager.getSetting(def.key), value => {
          stateManager.setSetting(def.key, value as never)
        })
        body.append(item.containerEl)
      }
    }
  })

  modal.open()
}
