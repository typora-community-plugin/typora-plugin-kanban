import type { Board, Item, Lane, LaneSort, Path } from './types'
import { createItem, generateId } from './types'
import type { KanbanStateManager } from './state-manager'
import { parseInlineMetadata, serializeInlineMetadata } from './parsers/inline-metadata'
import { today } from './utils/date'

export interface BoardModifiers {
  addLane(lane: Lane): void
  insertLane(index: number, lane: Lane): void
  updateLane(path: Path, patch: Partial<Lane>): void
  deleteLane(path: Path): void
  archiveLaneItems(path: Path): void
  /** 归档板内所有已完成卡片。 */
  archiveAllCompleted(): void
  appendItems(path: Path, items: Item[]): void
  prependItems(path: Path, items: Item[]): void
  updateItem(path: Path, patch: Partial<Item>): void
  deleteItem(path: Path): void
  /** 复制卡片并插入其后（新 id）。 */
  duplicateItem(path: Path): void
  /** 将多行卡片按行拆分为多张卡片。 */
  splitItem(path: Path): void
  /** 将单张卡片移入归档块。 */
  archiveItem(path: Path): void
  /** 支持 lane 内 / 跨 lane（`Path` = `[laneIndex]` 或 `[laneIndex, itemIndex]`）。 */
  moveEntity(src: Path, dst: Path): void
  sortLane(path: Path, by: LaneSort): void
}

// --- 不可变更新 helper（结构化拷贝，不引入 immer） --------------------------

function replaceLane(board: Board, laneIndex: number, updater: (lane: Lane) => Lane): Board {
  const lanes = board.lanes.slice()
  lanes[laneIndex] = updater(lanes[laneIndex])
  return { ...board, lanes }
}

function replaceItem(board: Board, path: Path, updater: (item: Item) => Item): Board {
  const [laneIndex, itemIndex] = path
  return replaceLane(board, laneIndex, lane => {
    const items = lane.items.slice()
    items[itemIndex] = updater(items[itemIndex])
    return { ...lane, items }
  })
}

export function updateBoard(board: Board, patch: Partial<Board>): Board {
  return { ...board, ...patch }
}

export function updateLane(board: Board, path: Path, patch: Partial<Lane>): Board {
  return replaceLane(board, path[0], lane => ({ ...lane, ...patch }))
}

export function updateItem(board: Board, path: Path, patch: Partial<Item>): Board {
  return replaceItem(board, path, item => ({ ...item, ...patch }))
}

// --- Modifiers ------------------------------------------------------------

export function createBoardModifiers(m: KanbanStateManager): BoardModifiers {
  const set = (updater: (b: Board) => Board) => m.setState(updater, { save: true })

  /** 追加到归档块：可选时间戳前缀 + `max-archive-size` 裁剪（丢弃最旧）。 */
  const archiveInto = (board: Board, items: Item[]): Board => {
    if (!items.length) return board

    const withDate = m.getSetting('archive-with-date')
    const dateLabel = withDate ? today(m.getSetting('date-format')) : ''
    const archived = dateLabel
      ? items.map(it => ({
        ...it,
        titleRaw: it.titleRaw ? `${dateLabel} ${it.titleRaw}` : dateLabel,
        title: it.title ? `${dateLabel} ${it.title}` : dateLabel,
      }))
      : items

    let archive = [...board.data.archive, ...archived]

    const max = m.getSetting('max-archive-size')
    if (max >= 0 && archive.length > max) archive = archive.slice(archive.length - max)

    return { ...board, data: { ...board.data, archive } }
  }

  return {
    addLane(lane) {
      set(b => ({ ...b, lanes: [...b.lanes, lane] }))
    },

    insertLane(index, lane) {
      set(b => {
        const lanes = b.lanes.slice()
        lanes.splice(index, 0, lane)
        return { ...b, lanes }
      })
    },

    updateLane(path, patch) {
      const isCollapseOnly = 'collapsed' in patch && Object.keys(patch).length === 1
      // 「记住折叠的列表」开启时把折叠态写入标题后的 HTML 注释，故需要落盘。
      if (isCollapseOnly && !m.getSetting('list-collapse')) {
        m.setState(b => updateLane(b, path, patch), { save: false })
      } else {
        set(b => updateLane(b, path, patch))
      }
    },

    deleteLane(path) {
      set(b => ({ ...b, lanes: b.lanes.filter((_, i) => i !== path[0]) }))
    },

    archiveLaneItems(path) {
      set(b => {
        const lane = b.lanes[path[0]]
        if (!lane || !lane.items.length) return b
        const archived = archiveInto(b, lane.items)
        return replaceLane(archived, path[0], l => ({ ...l, items: [] }))
      })
    },

    archiveAllCompleted() {
      set(b => {
        const done: Item[] = []
        const lanes = b.lanes.map(lane => {
          // `shouldMarkItemsComplete` 列内的全部卡片 + 其他列的已完成卡片。
          const kept = lane.items.filter(item => {
            if (lane.shouldMarkItemsComplete || item.checked) { done.push(item); return false }
            return true
          })
          return kept.length === lane.items.length ? lane : { ...lane, items: kept }
        })
        return archiveInto({ ...b, lanes }, done)
      })
    },

    appendItems(path, items) {
      set(b => replaceLane(b, path[0], l => ({ ...l, items: [...l.items, ...items] })))
    },

    prependItems(path, items) {
      set(b => replaceLane(b, path[0], l => ({ ...l, items: [...items, ...l.items] })))
    },

    updateItem(path, patch) {
      set(b => updateItem(b, path, patch))
    },

    deleteItem(path) {
      set(b => replaceLane(b, path[0], l => ({
        ...l,
        items: l.items.filter((_, i) => i !== path[1]),
      })))
    },

    duplicateItem(path) {
      set(b => replaceLane(b, path[0], l => {
        const item = l.items[path[1]]
        if (!item) return l
        const copy: Item = { ...item, id: generateId('i'), metadata: { ...item.metadata } }
        const items = l.items.slice()
        items.splice(path[1] + 1, 0, copy)
        return { ...l, items }
      }))
    },

    splitItem(path) {
      set(b => replaceLane(b, path[0], l => {
        const item = l.items[path[1]]
        if (!item) return l

        const lines = serializeInlineMetadata(item)
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
        if (lines.length <= 1) return l

        const newItems = lines.map(line => {
          const parsed = parseInlineMetadata(line)
          return {
            ...createItem(parsed.titleRaw),
            checked: item.checked,
            checkChar: item.checkChar,
            title: parsed.title,
            metadata: parsed.metadata,
          }
        })

        const items = l.items.slice()
        items.splice(path[1], 1, ...newItems)
        return { ...l, items }
      }))
    },

    archiveItem(path) {
      set(b => {
        const lane = b.lanes[path[0]]
        if (!lane) return b
        const item = lane.items[path[1]]
        if (!item) return b
        const archived = archiveInto(b, [item])
        return replaceLane(archived, path[0], l => ({
          ...l,
          items: l.items.filter((_, i) => i !== path[1]),
        }))
      })
    },

    moveEntity(src, dst) {
      if (src.length === 1 && dst.length === 1) {
        set(b => moveLane(b, src[0], dst[0]))
        return
      }
      if (src.length !== 2 || dst.length !== 2) return

      set(b => {
        // 完成态传播的列：已完成卡片拖出时自动归档（不进入目标列）。
        if (src[0] !== dst[0]) {
          const srcLane = b.lanes[src[0]]
          const item = srcLane?.items[src[1]]
          if (srcLane?.shouldMarkItemsComplete && item?.checked) {
            const removed = replaceLane(b, src[0], l => ({
              ...l,
              items: l.items.filter((_, i) => i !== src[1]),
            }))
            return archiveInto(removed, [item])
          }
        }
        return moveItem(b, src, dst)
      })
    },

    sortLane(path, by) {
      set(b => replaceLane(b, path[0], lane => ({
        ...lane,
        sorted: by,
        items: sortItems(lane.items, by),
      })))
    },
  }
}

function moveLane(board: Board, fromIndex: number, toIndex: number): Board {
  if (fromIndex === toIndex) return board
  const lanes = board.lanes.slice()
  const [lane] = lanes.splice(fromIndex, 1)
  const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex
  lanes.splice(insertAt, 0, lane)
  return { ...board, lanes }
}

/**
 * 移动 item。`dst` 语义：目标 lane 中「插入到该下标（原数组）之前」。
 * 同 lane 时先删后插，并修正目标下标。
 */
function moveItem(board: Board, src: Path, dst: Path): Board {
  const [srcLane, srcIndex] = src
  const [dstLane, dstIndex] = dst

  const sourceLane = board.lanes[srcLane]
  const targetLane = board.lanes[dstLane]
  if (!sourceLane || !targetLane) return board

  const item = sourceLane.items[srcIndex]
  if (!item) return board

  // 完成态传播：跨列拖入 `shouldMarkItemsComplete` lane → 自动勾选；
  // 拖出该 lane 不反勾（与 obsidian 行为一致）。
  const markComplete = srcLane !== dstLane && !!targetLane.shouldMarkItemsComplete && !item.checked
  const moved: Item = markComplete ? { ...item, checked: true, checkChar: 'x' } : item

  if (srcLane === dstLane) {
    const items = sourceLane.items.slice()
    items.splice(srcIndex, 1)
    const insertAt = dstIndex > srcIndex ? dstIndex - 1 : dstIndex
    items.splice(insertAt, 0, moved)
    return replaceLane(board, srcLane, l => ({ ...l, items }))
  }

  const lanes = board.lanes.slice()
  lanes[srcLane] = { ...sourceLane, items: sourceLane.items.filter((_, i) => i !== srcIndex) }
  lanes[dstLane] = { ...targetLane, items: [...targetLane.items.slice(0, dstIndex), moved, ...targetLane.items.slice(dstIndex)] }
  return { ...board, lanes }
}

function sortItems(items: Item[], by: LaneSort): Item[] {
  if (!by) return items
  const sorted = items.slice()
  const dir = by.endsWith('desc') ? -1 : 1
  const isDate = by.startsWith('date')

  sorted.sort((a, b) => {
    const av = isDate ? (a.metadata.date ?? '') : a.title
    const bv = isDate ? (b.metadata.date ?? '') : b.title
    if (av === bv) return 0
    if (av === '') return 1 // 缺失值排在最后
    if (bv === '') return -1
    return av.localeCompare(bv) * dir
  })
  return sorted
}
