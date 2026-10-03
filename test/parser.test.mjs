import assert from 'node:assert/strict'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import esbuild from 'esbuild'

const testDir = path.dirname(fileURLToPath(import.meta.url))

async function loadParsers() {
  const outfile = path.join(os.tmpdir(), `kanban-parser-test-${process.pid}.mjs`)
  await esbuild.build({
    stdin: {
      contents: `
        export { mdToBoard } from '../src/kanban/parsers/parse-markdown'
        export { boardToMd } from '../src/kanban/parsers/serialize'
        export { parseFrontmatter, stringifyFrontmatter, hasKanbanFlag, extractBoardSettings } from '../src/kanban/parsers/frontmatter'
        export { parseInlineMetadata, serializeInlineMetadata, extractTags, extractInlineFields, parseDateTokens } from '../src/kanban/parsers/inline-metadata'
      `,
      resolveDir: testDir,
      sourcefile: 'parser-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  })
  return import(pathToFileURL(outfile).href)
}

const parsers = await loadParsers()
const { mdToBoard, boardToMd, hasKanbanFlag, extractBoardSettings, parseInlineMetadata } = parsers

let passed = 0
function check(name, fn) {
  try {
    fn()
    passed++
    console.log(`  \u2713 ${name}`)
  }
  catch (err) {
    console.error(`  \u2717 ${name}`)
    console.error(err)
    process.exitCode = 1
  }
}

function roundTrip(name, md) {
  check(`round-trip: ${name}`, () => {
    const board = mdToBoard({ path: '/test.md', md })
    assert.equal(boardToMd(board), md)
  })
}

console.log('Phase 1 — parser round-trip')

// 1. 空板（仅 frontmatter）
roundTrip('empty board', '---\nkanban-plugin: board\n---\n')

// 2. 多列 + 已完成
roundTrip(
  'multi-lane + checked',
  '---\nkanban-plugin: board\n---\n\n'
  + '## Todo\n\n- [ ] Task A\n\n'
  + '## Doing\n\n- [x] Task B\n'
)

// 3. 标签 / inline field / 日期
roundTrip(
  'tags / inline field / date',
  '## Lane\n\n'
  + '- [ ] Task title #tag/a [due:: 2024-02-01] @2024-01-01\n'
)

// 4. 归档块
roundTrip(
  'archive block',
  '---\nkanban-plugin: board\n---\n\n'
  + '## Active\n\n- [ ] Keep\n\n'
  + '<!-- kanban:archive -->\n- [x] Done item\n<!-- /kanban:archive -->\n'
)

// 5. 无 frontmatter 的纯板
roundTrip('no frontmatter', '## Lane\n\n- [ ] A\n')

// 6. frontmatter 数组
roundTrip('frontmatter array', '---\nkanban-plugin: board\ntags: [a, b]\n---\n')

// 7. 空标题卡片
roundTrip('empty title card', '## Lane\n\n- [ ] \n')

// 8. 板级设置（frontmatter kanban-settings）
roundTrip(
  'board-level settings',
  '---\nkanban-plugin: board\nkanban-settings:\n  lane-width: 20\n  show-checkboxes: false\n---\n'
)

console.log('Phase 1 — structural assertions')

check('frontmatter flag / settings', () => {
  const fm = { 'kanban-plugin': 'board', 'kanban-settings': { 'lane-width': 20, 'show-checkboxes': false } }
  assert.equal(hasKanbanFlag(fm), true)
  assert.equal(hasKanbanFlag({}), false)
  const s = extractBoardSettings(fm)
  assert.equal(s['lane-width'], 20)
  assert.equal(s['show-checkboxes'], false)
})

check('metadata extraction', () => {
  const { titleRaw, title, metadata } = parseInlineMetadata('Task title #tag/a [due:: 2024-02-01] @2024-01-01')
  assert.equal(titleRaw, 'Task title')
  assert.equal(title, 'Task title')
  assert.deepEqual(metadata.tags, ['#tag/a'])
  assert.deepEqual(metadata.inlineFields, [{ key: 'due', value: '2024-02-01' }])
  assert.equal(metadata.date, '2024-01-01')
})

check('bare inline field + keyword date', () => {
  const { metadata } = parseInlineMetadata('Meeting status:: active due:: 2024-03-01')
  assert.deepEqual(metadata.inlineFields, [{ key: 'status', value: 'active' }])
  assert.equal(metadata.date, '2024-03-01')
})

check('no frontmatter / plain text does not throw', () => {
  const board = mdToBoard({ path: '/plain.md', md: '# Title\n\nLorem ipsum.\n' })
  assert.deepEqual(board.lanes, [])
  assert.deepEqual(board.data.archive, [])
})

check('archive parsed into data.archive', () => {
  const md = '## A\n\n- [ ] x\n\n<!-- kanban:archive -->\n- [x] old\n<!-- /kanban:archive -->\n'
  const board = mdToBoard({ path: '/a.md', md })
  assert.equal(board.lanes.length, 1)
  assert.equal(board.data.archive.length, 1)
  assert.equal(board.data.archive[0].checked, true)
  assert.equal(board.data.archive[0].titleRaw, 'old')
})

check('nested items become sub-content of parent card', () => {
  const md = '## Todo\n\n- [ ] todo item\n  - [x] phase 1\n  - [ ] phase 2\n'
  const board = mdToBoard({ path: '/nested.md', md })
  assert.equal(board.lanes[0].items.length, 1, 'should produce exactly 1 card')
  const item = board.lanes[0].items[0]
  // normalizeTitle strips indentation from continuation lines, so sub-content appears without indent
  assert.ok(item.titleRaw.includes('todo item'))
  assert.ok(item.titleRaw.includes('- [x] phase 1'), 'phase 1 should appear as sub-content')
  assert.ok(item.titleRaw.includes('- [ ] phase 2'), 'phase 2 should appear as sub-content')
})

check('round-trip preserves nested items (serialize uses tab for continuation)', () => {
  const md = '## Todo\n\n- [ ] todo item\n  - [x] phase 1\n  - [ ] phase 2\n'
  const board = mdToBoard({ path: '/rt.md', md })
  const output = boardToMd(board)
  // serialize uses tab for sub-content continuation lines
  const expected = '## Todo\n\n- [ ] todo item\n\t- [x] phase 1\n\t- [ ] phase 2\n'
  assert.equal(output, expected)
})

console.log('Phase 10 — vault samples round-trip')

const vaultDir = path.join(testDir, 'vault')
const samplesDir = path.join(vaultDir, 'samples')

const samplePaths = [
  path.join(vaultDir, 'doc.md'),
  ...(await fs.readdir(samplesDir))
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => path.join(samplesDir, f)),
]

for (const file of samplePaths) {
  const name = path.relative(testDir, file).replace(/\\/g, '/')
  const md = await fs.readFile(file, 'utf8')

  check(`round-trip: ${name}`, () => {
    const board = mdToBoard({ path: '/' + name, md })
    assert.equal(boardToMd(board), md)
  })

  check(`kanban flag: ${name}`, () => {
    const board = mdToBoard({ path: '/' + name, md })
    assert.equal(hasKanbanFlag(board.data.frontmatter), true)
  })
}

if (process.exitCode) {
  console.error(`\n${passed} passed, some failed.`)
  process.exit(process.exitCode)
}
else {
  console.log(`\nAll ${passed} checks passed.`)
}
