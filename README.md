# 麦壳壁纸 MacWall-desktop

> 麦壳壁纸 MacWall 官网（[macwall.skin](https://macwall.skin)）的 GitHub 子项目：**桌面引擎技术交流站**——收录公开开源的壁纸引擎效果代码，提供在线效果演示与技术交流。

本站公开的内容：窗口效果演示页（`index.html`）、粒子效果引擎（`site-assets/effects.js`）与全部演示代码。完整的壁纸产品与壁纸展示效果，请访问官网 macwall.skin。

## ✨ 效果演示（代码开源）

在线体验：[https://gsaecy.github.io/MacWall-desktop/](https://gsaecy.github.io/MacWall-desktop/)（GitHub Pages，开启方式见下方「部署」）

| 效果 | 说明 | 壁纸展示 |
|---|---|---|
| 壁纸循环特效 | 雪花 / 花瓣 / 落叶 / 蒲公英 / 萤火虫 / 泡泡 / 火星 / 爱心，实时切换预览 | [官网查看](https://macwall.skin) |
| 鼠标互动特效 | 星尘光尾II / 七彩蝴蝶 / 火星四溅 / 萤火光迹，跟随真实鼠标轨迹渲染 | [官网查看](https://macwall.skin) |
| 音乐律动时钟 | 玲珑幻彩 / 时空波纹 / 霓虹灯牌，本页以模拟节奏驱动律动 | [官网查看](https://macwall.skin) |

> 效果引擎 `site-assets/effects.js` 与演示页 `index.html` 全部公开开源，欢迎研究、参考与二次开发；完整壁纸展示效果链接到官网。

## 📚 收录的开源壁纸引擎

本站收录以下公开开源的壁纸引擎项目（详见演示页「开源收录」区）：

| 项目 | 平台 | 说明 |
|---|---|---|
| [MacWall-desktop](https://github.com/Gsaecy/MacWall-desktop) | Web | 本仓库：粒子特效引擎与 macOS 窗口演示页，公开开源 |
| [Lively Wallpaper](https://github.com/rocksdanister/lively) | Windows | 开源动态壁纸引擎（GIF / 视频 / 网页） |
| [WinDynamicDesktop](https://github.com/t1m0thyj/WinDynamicDesktop) | Windows | 动态壁纸（macOS Dynamic HEIF 壁纸方案） |
| [dynamic-wallpaper](https://github.com/adi1090x/dynamic-wallpaper) | Linux | 动态壁纸脚本合集（GNOME / KDE） |
| [playground-macos](https://github.com/Renovamen/playground-macos) | Web | 网页版 macOS 桌面模拟（本仓库 Dock 图标来源，MIT） |
| [macos-web](https://github.com/PuruVJ/macos-web) | Web | 网页版 macOS 桌面模拟（MIT） |

> 收录更多开源壁纸引擎？直接提 [Issue](https://github.com/Gsaecy/MacWall-desktop/issues/new?template=feedback.yml) 或参与 Discussions 交流。

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
├── index.html                    # 效果演示 + 开源收录 + 公开留言（GitHub Pages，开源）
├── site-assets/                  # 效果引擎、壁纸图与特效素材（开源）
│   ├── effects.js                # 粒子效果引擎（MacEffectsFactory）
│   ├── petals/ leaves/           # 花瓣 / 落叶素材
│   ├── mac-icons/                # Dock 图标（MIT，见目录内 LICENSE）
│   └── *.jpg                     # 演示壁纸
└── .github/ISSUE_TEMPLATE/       # 留言 / 反馈 Issue 模板
```

## 🔗 相关链接

- 官网（完整壁纸展示效果）：<https://macwall.skin>
- 本仓库：<https://github.com/Gsaecy/MacWall-desktop>
- 客服邮箱：[support@macwall.skin](mailto:support@macwall.skin)

## ⚖️ 许可

本仓库效果代码（`index.html`、`site-assets/effects.js` 等）公开开源，供学习交流使用；演示壁纸图片与特效素材版权归麦壳壁纸（深圳市宏荣天秀贸易有限公司）所有，请勿商用。`site-assets/mac-icons/` 内 Dock 图标来自 [playground-macos](https://github.com/Renovamen/playground-macos) 与 [macos-web](https://github.com/PuruVJ/macos-web)（MIT License，详见目录内 LICENSE 文件）。

