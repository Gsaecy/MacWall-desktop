# MacWall Desktop Engine Exchange

> A sub-project of the MacWall website ([macwall.skin](https://macwall.skin)): a **Desktop Engine Exchange** — a curated collection of open-source wallpaper engine effect code, with live demos and community feedback.

Everything in this repository is public: the demo page (`index.html`), the particle effect engine (`site-assets/effects.js`) and all demo code. The full wallpaper product and showcase live on the official website, macwall.skin.

## ✨ Live demos (open source)

Try it online: [https://gsaecy.github.io/MacWall-desktop/](https://gsaecy.github.io/MacWall-desktop/) (GitHub Pages — see Deployment below)

| Effect | Description | Full showcase |
|---|---|---|
| Wallpaper effects | Snow, petals, leaves, dandelions, fireflies, bubbles, embers, hearts — live switching | [Official site](https://macwall.skin) |
| Mouse effects | Stardust Trail II, Rainbow Butterflies, Spark Burst, Firefly Trails — follow your real cursor | [Official site](https://macwall.skin) |
| Music-reactive clock | Crystal Glow, Ripples, Neon Sign — driven by a simulated music rhythm | [Official site](https://macwall.skin) |

> The effect engine `site-assets/effects.js` and the demo page `index.html` are fully open source — study them, remix them, and share what you build.

## 📚 Open-source wallpaper engines

A curated collection of publicly available wallpaper engine projects (also listed on the demo page):

| Project | Platform | Notes |
|---|---|---|
| [MacWall-desktop](https://github.com/Gsaecy/MacWall-desktop) | Web | This repository: particle effect engine and macOS window demos, open source |
| [Lively Wallpaper](https://github.com/rocksdanister/lively) | Windows | Open-source animated desktop engine (GIF / video / web) |
| [WinDynamicDesktop](https://github.com/t1m0thyj/WinDynamicDesktop) | Windows | Dynamic wallpapers (macOS Dynamic HEIF scheme) |
| [dynamic-wallpaper](https://github.com/adi1090x/dynamic-wallpaper) | Linux | Dynamic wallpaper scripts (GNOME / KDE) |
| [playground-macos](https://github.com/Renovamen/playground-macos) | Web | macOS desktop in the browser (source of this repo's Dock icons, MIT) |
| [macos-web](https://github.com/PuruVJ/macos-web) | Web | macOS desktop in the browser (MIT) |

> Want another engine listed? Open an [issue](https://github.com/Gsaecy/MacWall-desktop/issues/new?template=feedback.yml) or join the discussion.

## 🧭 Community docs

- [CONTRIBUTING.md](./CONTRIBUTING.md) — how to report bugs, submit new effects, add engines to the directory, and PR conventions
- [ENGINE_GUIDE.md](./ENGINE_GUIDE.md) — `effects.js` architecture, public API, and a step-by-step guide to building your own wallpaper / mouse / clock effects

## 💭 Join the discussion (GitHub Discussions)

The technology exchange lives in **GitHub Discussions**:

- **💡 Ideas & proposals** — share new effects, architecture thoughts, feature requests
- **🎨 Show & tell** — post your remixes, forks and custom particle effects
- **❓ Q&A** — ask anything about `effects.js`, the macOS client engine or the demo page
- **📢 Announcements** — release notes and community updates

Open [Discussions](https://github.com/Gsaecy/MacWall-desktop/discussions) and say hi. Issues are for bugs and feedback; everything else belongs in Discussions.

## 💬 Feedback module

The demo page has a public feedback section backed by GitHub:

- **Works out of the box**: visitors click "Leave feedback" to open the [`feedback.yml`](.github/ISSUE_TEMPLATE/feedback.yml) issue form;
- **Optional embedded comments (2-minute setup for the repo owner)**: use [giscus](https://giscus.app/) to embed GitHub Discussions into the page:

1. Repository Settings → General → Features → enable **Discussions**;
2. Install the [giscus app](https://github.com/apps/giscus) and authorize this repository;
3. Open [giscus.app](https://giscus.app), fill in `Gsaecy/MacWall-desktop`, pick the comments category (e.g. `Announcements`) and copy the `repoId` and `categoryId`;
4. Edit the `GISCUS_CONFIG` at the bottom of [`index.html`](index.html): set `ready` to `true` and fill in `repoId` and `categoryId` (update the category name if it is not `Announcements`).

Once configured, visitors can comment, react and reply right on the page.

## 🚀 Deployment (GitHub Pages)

Repository Settings → Pages → Build and deployment → **Deploy from a branch**, select `main` / `(root)` and save:

```
https://gsaecy.github.io/MacWall-desktop/
```

## 📁 Structure

```text
├── index.html                    # Effect demos + engine collection + feedback (GitHub Pages, open source)
├── site-assets/                  # Effect engine, wallpaper images and assets (open source)
│   ├── effects.js                # Particle effect engine (MacEffectsFactory)
│   ├── petals/ leaves/           # Petal / leaf sprites
│   ├── mac-icons/                # Dock icons (MIT, see LICENSE files inside)
│   └── *.jpg                     # Demo wallpapers
└── .github/ISSUE_TEMPLATE/       # Feedback issue template
```

## 🔗 Links

- Official site (full wallpaper showcase): <https://macwall.skin>
- This repository: <https://github.com/Gsaecy/MacWall-desktop>
- Support email: [support@macwall.skin](mailto:support@macwall.skin)

## ⚖️ License

The effect code in this repository (`index.html`, `site-assets/effects.js`, etc.) is open source for study and exchange. Demo wallpaper images and effect assets are copyrighted by MacWall (Shenzhen Honor World Trading Co., Ltd.) and are not for commercial use. Dock icons in `site-assets/mac-icons/` come from [playground-macos](https://github.com/Renovamen/playground-macos) and [macos-web](https://github.com/PuruVJ/macos-web) (MIT License, see the LICENSE files in that folder).


