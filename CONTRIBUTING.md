# Contributing to MacWall Desktop Engine Exchange

Thanks for your interest in contributing to the community! This repository is an
open-source exchange for wallpaper engine effects, demos and research.

## Ways to contribute

1. **Report bugs / give feedback** — open an issue with the `feedback.yml` template
   (or any issue) describing the problem, the effect name and your browser/OS.
2. **Propose ideas** — use GitHub Discussions → 💡 Ideas & proposals.
3. **Add a new open-source engine to the directory** — open a PR that appends a row
   to the "Open-source wallpaper engines" table in `README.md` (and `index.html`
   if the demo lists it). Include: name, platform, short description, repo link, license.
4. **Submit a new effect** — see [ENGINE_GUIDE.md](./ENGINE_GUIDE.md) for the
   `effects.js` architecture and how to add a wallpaper / mouse / clock effect.
   Open a PR with the effect, a 5–10s demo recording (or GIF), and a few lines of docs.

## Pull request guidelines

- Base branch: `main`. Keep one PR per change.
- `site-assets/effects.js` is the single source for the engine; keep the existing
  code style (ES5-ish, factory pattern, no build step, no external deps).
- Fixed-seed randomness (`mulberry32`) is used on purpose — new effects must be
  deterministic when seeded the same way, so demos stay reproducible.
- Sprites must be small (≤256px) and loaded lazily via the shared asset pattern
  (`SharedPetalAssets` / `SharedLeafAssets`).
- Performance matters: keep the effect under ~60fps on a 2× DPR canvas; avoid
  per-frame allocations in hot loops; reuse `Path2D` / cached glow canvases.
- Mark demo wallpaper images: they are copyrighted (see LICENSE), don't add new
  copyrighted images without permission.

## Commit messages

Use a short imperative summary, e.g. `feat: add aurora wallpaper effect`,
`fix: petals recycle off-screen when resized`.

## Code of conduct

Be constructive. This is a research & exchange community — debates about
approaches are welcome, personal attacks are not. Keep discussion in English or
Chinese, both are fine.
