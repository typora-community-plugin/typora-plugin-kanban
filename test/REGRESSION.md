# 手动回归清单

在 Typora 中打开 `test/vault/doc.md`（或 `test/vault/samples/*`）后逐项验证。

## 构建

- [ ] `pnpm run build:dev` 成功并自动装入 Typora
- [ ] `pnpm run build` 成功，生成 `dist/main.js` + `dist/style.css`
- [ ] `npx tsc --noEmit` 无报错
- [ ] `pnpm run test:parser` 全部通过

## 增删改

- [ ] 命令面板（F1）执行「以看板视图打开」，正确渲染列表 / 卡片
- [ ] 新增列表（+ Add a list / 命令）后写回 `.md`
- [ ] 双击列表标题重命名；Enter 提交、Esc 取消、失焦提交
- [ ] 双击卡片编辑；Enter / Shift+Enter 行为符合 `new-line-trigger`
- [ ] 新增卡片后可识别 `#tag`、`@日期`、`[key:: value]`
- [ ] 删除 / 复制 / 归档卡片（均有二次确认）
- [ ] 删除列表（二次确认）

## 拖拽

- [ ] 列表内拖拽排序，Markdown 顺序正确
- [ ] 跨列表拖拽，Markdown 顺序正确
- [ ] 列表本身拖拽交换顺序
- [ ] 拖入 `shouldMarkItemsComplete` 列自动勾选
- [ ] 拖出该列时已完成卡片进入归档（如启用）
- [ ] 拖拽过程无闪烁 / 重复卡片

## 归档

- [ ] 卡片菜单 / 列表菜单 / Header「Archive all」归档
- [ ] 开启 `archive-with-date` 后归档卡片带日期前缀
- [ ] 设置 `max-archive-size` 后超限裁剪最旧
- [ ] 归档内容位于 `<!-- kanban:archive -->` 块，重新解析一致

## 搜索

- [ ] 搜索框实时过滤（debounce 250ms），未命中隐藏
- [ ] 命中文本以 `<mark class="is-search-match">` 高亮
- [ ] Esc / 清除按钮退出搜索后还原

## 设置

- [ ] 全局设置页（设置 -> 插件）分组与控件完整
- [ ] 修改设置即时生效并写入 `.typora/data/typora-community-plugin.kanban.json`
- [ ] 重启 Typora 后设置保留
- [ ] 板级设置（frontmatter `kanban-settings`）覆盖全局设置

## 命令与集成

- [ ] 全部命令可从命令面板搜索并执行
- [ ] 视图切换（看板 ↔ Markdown）不丢内容、不产生重复 leaf
- [ ] 开启 `auto-open` 后打开看板文件自动进入看板视图
- [ ] 文件夹右键「New kanban board」可用
- [ ] `.md` 右键「Open as kanban board」/「Open as markdown」可用
- [ ] 文件重命名后看板仍指向新路径

## i18n

- [ ] 切换语言（设置 -> 关于 -> 语言）后命令 / 菜单 / 设置文案更新

## 主题

- [ ] 内置主题 × 浅色 / 深色下样式正常
- [ ] 第三方主题（如 Vue / Github / Night）下样式正常
- [ ] 对比度足够，无错位 / 溢出
