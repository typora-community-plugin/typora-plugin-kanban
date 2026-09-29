import { Modal } from '@typora-community-plugin/core'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
}

/**
 * 破坏性操作二次确认（基于 core `Modal`）。
 *
 * 关闭方式：点击确认 / 取消、Esc、点击遮罩 → 分别 resolve `true` / `false`。
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    let settled = false
    const modal = new Modal({})
    const ref: { confirmBtn: HTMLButtonElement | null } = { confirmBtn: null }

    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      modal.close()
      resolve(value)
    }

    modal.setHeader(options.title)

    if (options.message) {
      modal.setBody(body => {
        const p = document.createElement('p')
        p.className = 'typ-kanban-modal-message'
        p.textContent = options.message!
        body.appendChild(p)
      })
    }

    modal.setFooter(footer => {
      const cancel = document.createElement('button')
      cancel.type = 'button'
      cancel.className = 'typ-kanban-btn'
      cancel.textContent = options.cancelText ?? 'Cancel'
      cancel.onclick = () => finish(false)

      const confirmBtn = document.createElement('button')
      confirmBtn.type = 'button'
      confirmBtn.className = 'typ-kanban-btn is-primary'
      confirmBtn.textContent = options.confirmText ?? 'OK'
      confirmBtn.onclick = () => finish(true)

      ref.confirmBtn = confirmBtn
      footer.append(cancel, confirmBtn)
    })

    modal.onClose(() => {
      if (settled) return
      settled = true
      resolve(false)
    })

    modal.open()
    ref.confirmBtn?.focus()
  })
}
