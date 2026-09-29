# Typora 插件 Kanban

[English](./README.md) | 中文

这是一个基于 [typora-community-plugin][core] 的 [Typora](https://typoraio.cn) 插件。

将 Markdown 文件渲染为可交互的看板：`##` 标题作为列表，`- [ ]` 条目作为可拖拽卡片。新增、重命名、排序、归档与搜索都在 Markdown 中完成，所有改动会即时写回文件。

## 功能

- **Markdown 即数据源** — 含 `kanban-plugin` frontmatter 的文件以看板打开。
- **多视图** — 看板 / 列表 / 表格三种布局，可从工具栏或命令面板切换。
- **列表与卡片** — 新增、重命名、删除、复制、拆分、归档。
- **拖拽** — 列表内 / 跨列表排序卡片，以及排序列表。
- **复选框** — 完成态，并支持拖入「完成」列表时自动勾选。
- **归档** — 手动或批量归档，可选日期戳与数量上限。
- **搜索** — 就地过滤列表与卡片，并高亮命中内容。
- **日期与标签** — 相对日期、过期/临近高亮、标签颜色与排序。
- **设置** — 全局默认值 + 板级覆盖。
- **多语言** — 简体中文与英文。

## 用法

在文件 frontmatter 中加入 `kanban-plugin`，然后在命令面板（<kbd>F1</kbd>）执行 **Kanban: 以看板视图打开**：

````markdown
---
kanban-plugin: board
---

## Todo

- [ ] 编写解析器 #dev {{priority:: high}} @2024-01-01

## Done

- [x] 搭建项目
````

- `## 标题` 开始一个新列表。
- `- [ ]` / `- [x]` 是一张卡片，勾选状态会被同步。
- `#标签`、`{{key:: value}}` 与 `@YYYY-MM-DD`（可带 `HH:mm`）会被自动解析。

## 命令

| 命令 | 说明 |
|---|---|
| 以看板视图打开 | 将当前文件切换为看板视图。 |
| 切换看板视图 | 在看板与 Markdown 视图之间切换。 |
| 新建看板 | 新建一个看板文件。 |
| 归档已完成卡片 | 将所有已完成卡片移入归档。 |
| 添加看板列表 | 在当前看板新增列表。 |
| 打开看板设置 | 编辑当前看板的设置。 |
| 搜索卡片 | 展开搜索框。 |

## 安装

1. 安装 [typora-community-plugin][core]
2. 打开「设置 -> 插件市场」搜索「Kanban」并安装。

## 开发

```bash
pnpm install
pnpm run build:dev   # esbuild 开发构建，并安装到 Typora
pnpm run build       # rollup 发布构建
pnpm run pack        # 产出 plugin.zip
```

## License

MIT

[core]: https://github.com/typora-community-plugin/typora-community-plugin
