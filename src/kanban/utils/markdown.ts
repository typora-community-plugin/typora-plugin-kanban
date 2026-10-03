/**
 * 卡片标题的行内 Markdown 渲染。
 *
 * 复用 Typora 内置解析器 `editor.MarkParser.parseInline()`：它输出的 HTML 含
 * 源码标记（`<span class="md-meta">**</span>`），在编辑器里由 CSS 隐藏；看板容器
 * 不在 `#write` 下，故此处主动剔除 `.md-meta` 得到干净的富文本。
 */

import { editor, MathJax } from "typora"

interface TyporaMarkParser {
  /** 将行内 Markdown 解析为 HTML。 */
  parseInline(markdown: string): string
}

interface TyporaEditor {
  MarkParser?: TyporaMarkParser
}

function getTyporaEditor() {
  return editor as TyporaEditor
}

/** 触发 Typora 的 MathJax 渲染行内公式（`parseInline` 产出的是待处理节点）。 */
export function typesetInlineMath(root: HTMLElement): void {
  const nodes = [...root.querySelectorAll<HTMLElement>('.math-jax-preprocess')]
  if (!nodes.length) return
  void MathJax.typesetPromise(nodes).catch(() => undefined)
}

/**
 * 将 `text` 渲染为行内富文本 HTML；搜索命中片段包裹为 `mark`。
 * 解析器不可用（非 Typora 环境）时回退为纯文本。
 */
export function renderInlineMarkdown(text: string, query = ''): string {
  const container = document.createElement('div')
  const parser = getTyporaEditor()?.MarkParser

  if (parser) {
    try {
      container.innerHTML = parser.parseInline(text)
    } catch {
      container.textContent = text
    }
  } else {
    container.textContent = text
  }

  container.querySelectorAll('.md-meta').forEach(el => el.remove())

  const q = query.trim()
  if (q) highlightTextNodes(container, q)

  return container.innerHTML
}

/** 遍历文本节点，把命中 `query`（不区分大小写）的片段包裹为 `mark`。 */
function highlightTextNodes(root: Node, query: string): void {
  const q = query.toLowerCase()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []

  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    if (text.nodeValue && text.nodeValue.toLowerCase().includes(q)) targets.push(text)
    node = walker.nextNode()
  }

  for (const text of targets) {
    const value = text.nodeValue ?? ''
    const lower = value.toLowerCase()
    const fragment = document.createDocumentFragment()

    let from = 0
    let at = lower.indexOf(q, from)
    while (at >= 0) {
      if (at > from) fragment.appendChild(document.createTextNode(value.slice(from, at)))
      const mark = document.createElement('mark')
      mark.className = 'is-search-match typ-kanban-search-match'
      mark.textContent = value.slice(at, at + q.length)
      fragment.appendChild(mark)
      from = at + q.length
      at = lower.indexOf(q, from)
    }
    if (from < value.length) fragment.appendChild(document.createTextNode(value.slice(from)))

    text.parentNode?.replaceChild(fragment, text)
  }
}
