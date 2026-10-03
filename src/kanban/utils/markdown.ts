/**
 * 卡片内容的 Markdown 渲染。
 *
 * 复用 Typora 内置的块级渲染器 `app.features.markdownRenderer.renderTo()`：
 * 与行内解析器不同，它支持嵌套块（引用、列表、代码块、表格、公式等）。
 * 渲染后主动剔除源码标记 `.md-meta`，并按搜索词高亮命中片段。
 */

import type { App } from '@typora-community-plugin/core'

/**
 * 将 `md` 渲染为块级 HTML 写入 `targetEl`；搜索命中片段包裹为 `mark`。
 * 渲染器不可用（非 Typora 环境）或抛错时回退为纯文本。
 */
export function renderMarkdownBlock(
  md: string,
  targetEl: HTMLElement,
  app?: App,
  query = '',
): void {
  targetEl.textContent = ''

  const renderer = app?.features?.markdownRenderer
  if (renderer) {
    try {
      renderer.renderTo(md, targetEl)
    } catch {
      targetEl.textContent = md
    }
  } else {
    targetEl.textContent = md
  }

  // `renderTo` 使用 Typora 标记解析器，输出含源码标记；看板容器不在 `#write` 下，主动剔除。
  targetEl.querySelectorAll('.md-meta').forEach(el => el.remove())

  const q = query.trim()
  if (q) highlightTextNodes(targetEl, q)
}

/** 高亮时跳过的容器（代码块 / 公式由各自渲染器接管其 DOM）。 */
const HIGHLIGHT_SKIP_SELECTOR = 'pre.md-fences, .md-fences, .CodeMirror, .math-jax-preprocess, mjx-container, .MathJax'

/** 遍历文本节点，把命中 `query`（不区分大小写）的片段包裹为 `mark`。 */
function highlightTextNodes(root: Node, query: string): void {
  const q = query.toLowerCase()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const targets: Text[] = []

  let node = walker.nextNode()
  while (node) {
    const text = node as Text
    const parent = text.parentElement
    const skippable = parent?.closest(HIGHLIGHT_SKIP_SELECTOR)
    if (!skippable && text.nodeValue && text.nodeValue.toLowerCase().includes(q)) {
      targets.push(text)
    }
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
