# 麦壳壁纸 MacWall-desktop

> 麦壳壁纸 MacWall 官网（[macwall.skin](https://macwall.skin)）的 GitHub 子项目：**窗口效果演示 + 公开留言反馈**。

把 macOS 桌面变成「会呼吸的风景」：动态壁纸、壁纸循环特效、鼠标互动与音乐律动时钟。本仓库把官网展示的桌面窗口效果完整复制到 GitHub 上，让所有人无需安装即可在浏览器里体验，并在此公开留言、提意见。

## ✨ 窗口效果演示

在线体验：[https://gsaecy.github.io/MacWall-desktop/](https://gsaecy.github.io/MacWall-desktop/)（GitHub Pages，开启方式见下方「部署」）

| 效果 | 说明 |
|---|---|
| 壁纸循环特效 | 雪花 / 花瓣 / 落叶 / 蒲公英 / 萤火虫 / 泡泡 / 火星 / 爱心，实时切换预览 |
| 鼠标互动特效 | 星尘光尾II / 七彩蝴蝶 / 火星四溅 / 萤火光迹，跟随真实鼠标轨迹渲染 |
| 音乐律动时钟 | 玲珑幻彩 / 时空波纹 / 霓虹灯牌，本页以模拟节奏驱动律动 |

> 效果引擎 `site-assets/effects.js` 与官网一致，直接移植自 macOS 客户端粒子模型；窗口 UI（菜单栏 + Dock）复刻官网展示卡。

## 💬 公开留言模块

留言模块已内置在演示页底部，数据存放于 GitHub 公共空间，完全公开：

- **开箱即用（无需配置）**：页面提供「📝 留言 / 提反馈（Issue 表单）」按钮，点击即打开 [`feedback.yml`](.github/ISSUE_TEMPLATE/feedback.yml) 留言表单；
- **内嵌评论区（可选，2 分钟配置）**：使用 [giscus](https://giscus.app/) 把 GitHub Discussions 嵌入页面：

1. 仓库 Settings → General → Features 勾选 **Discussions**；
2. 安装 [giscus App](https://github.com/apps/giscus) 并授权本仓库；
3. 打开 [giscus.app](https://giscus.app)，填入仓库 `Gsaecy/MacWall-desktop`，按提示选择留言分类（如 `Announcements`），获得 `repoId` 与 `categoryId`；
4. 编辑 [`index.html`](index.html) 底部 `GISCUS_CONFIG`：把 `ready` 改为 `true`，填入 `repoId`、`categoryId`（分类名如非 `Announcements` 请同步修改）。

完成后刷新页面，留言区直接嵌入，用户登录 GitHub 即可留言、点赞与回复。

## 🚀 部署（GitHub Pages）

仓库 Settings → Pages → Build and deployment 选择 **Deploy from a branch**，Branch 选 `main` / `(root)`，保存后访问：

```
https://gsaecy.github.io/MacWall-desktop/
```

## 📁 仓库结构

```text
├── index.html                    # 窗口效果演示 + 公开留言（GitHub Pages）
├── site-assets/                       # 效果引擎、壁纸图与特效素材（与官网同源）
│   ├── effects.js                # 粒子效果引擎（MacEffectsFactory）
│   ├── petals/ leaves/           # 花瓣 / 落叶素材
│   ├── mac-icons/                # Dock 图标（MIT，见目录内 LICENSE）
│   └── *.jpg                     # 演示壁纸
└── .github/ISSUE_TEMPLATE/       # 留言 / 反馈 Issue 模板
```

## 🔗 相关链接

- 官网：<https://macwall.skin>
- 主仓库：<https://github.com/Gsaecy/MacWall>（客户端 + 内容服务 + 官网源码）
- 客服邮箱：[support@macwall.skin](mailto:support@macwall.skin)

## ⚖️ 许可

演示壁纸与特效素材版权归麦壳壁纸（深圳市宏荣天秀贸易有限公司）所有；`site-assets/mac-icons/` 内 Dock 图标来自 [playground-macos](https://github.com/Renovamen/playground-macos) 与 [macos-web](https://github.com/PuruVJ/macos-web)（MIT License，详见目录内 LICENSE 文件）。

