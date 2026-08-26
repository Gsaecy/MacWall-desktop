# effects.js — Engine Development Guide

`site-assets/effects.js` is the open-source wallpaper effect engine (a port of the
macOS client, `MacEffectsFactory`). This guide explains its architecture and how
to add new effects.

## Quick start

```js
const engine = MacEffectsFactory();
engine.init(fxCanvas, clockCanvas /* optional */);

engine.setWallpaperEffect('snow');   // wallpaper loop effect
engine.setMouseEffect('butterflies'); // mouse interaction effect
engine.setClockStyle('crystal');     // music clock style
engine.pointerMove(x, y);            // normalized 0..1
engine.pointerDown();                // click (used by spark)
engine.audioData(level, [b0, b1, b2]); // 0..1 level + 3 bands
engine.resize();                     // call on container resize
```

`window.MacEffects` is the default singleton (legacy), `MacEffectsFactory()`
creates independent instances (one per demo card).

## Public API

| Method | Args | Notes |
|---|---|---|
| `init(fxCanvas, clock)` | canvas elements | starts the rAF loop; `clock` optional |
| `resize()` | — | re-captures size, forces 2× DPR supersampling |
| `setWallpaperEffect(name)` | `snow`,`fireflies`,`embers`,`bubbles`,`leaves`,`petals`,`dandelions`,`hearts`,`none` | wallpaper loop |
| `setMouseEffect(name)` | `comet`,`cometII`,`butterflies`,`spark`,`fireflyTrail` | resets particle pools |
| `setClockStyle(name)` | `crystal`,`ripples`,`neonBrand` | music clock |
| `pointerMove(x,y)` | normalized | updates mouse + trail |
| `pointerDown()` | — | spawns sparks when `spark` active |
| `audioData(level, bands)` | 0..1 | drives clock / reactive elements |
| `resetTrail()` | — | resets mouse trail anchor |

## Architecture

```
- Fixed-seed PRNG: mulberry32(seed); rand(seed) per effect ("SNOW","FIRE",…)
  → deterministic, no per-frame jitter
- Particle state: initialised once in initXxx(), advanced in drawXxx(t)
- Coordinate space: normalized 0..1 (x,y), converted with W/H at draw time
- Scaling: dpr = 2 forced; dispScale = clamp(min(W/1920, H/1080), 0.45..1.2)
  (App 1920×1080 baseline)
- Sprites: shared lazily-loaded Image lists (≤256px), with procedural fallback
  when the asset has not finished loading
- Frame loop: requestAnimationFrame(frame), dt clamped to 0.05s, fixed phase
- Layers / glow: radial-gradient glow canvases cached by key; 'lighter'
  composite for additive glow
```

## How to add a new wallpaper effect (example: "aurora")

1. Add a state holder + animation seed:
   ```js
   var aurora = null;
   function initAurora() {
     var r = rand(0x4155524F); // "AURO"
     aurora = [];
     for (var i = 0; i < 60; i++) {
       aurora.push({ x: r(), y: r(), phase: r() * TAU, band: i % 3 });
     }
   }
   ```
2. Add a draw function `drawAurora(t)` using `ctx` (canvas context, W/H, dpr,
   dispScale available in closure).
3. Register it:
   - call `initAurora();` inside `init()`
   - add `else if (wallEffect === 'aurora') drawAurora(t);` in `drawWallEffect(t)`
   - (optional) expose the id in the demo page buttons.
4. Follow the style: keep particles normalized, use cached glow/`Path2D`, no
   allocations per frame, deterministic with the seed.

## How to add a mouse effect

Mirror `spawnTrailFlyAt` / `drawTrailFlies`: track `trailLast`, spawn along the
pointer path (step distance), advance with damping, draw with additive glow, cap
pool size (e.g. 2000), and clear on large jumps (>0.20).

## How to add a clock style

Add `drawXxxClock(cx, cy, radius, t, time)` and dispatch in `drawClock(t)`.
Reuse `drawGlassText` for the digits; drive luminance via `audio.level` /
`audio.bands`. Keep the whole clock drawn inside `clockCtx` after the built-in
0.5 scale (the demo deliberately shrinks the clock to 50%).

## Performance notes

- 2× DPR supersampling is mandatory (crisp particles) — do not lower it blindly.
- Cache glow images (`sparkGlowImage`, `butterflyGlowImage`) by color index.
- Cap pools (sparks ≤1500, butterflies ≤1200, trailFlies ≤2000…).
- Use `ctx.save()/restore()` sparingly; batch by `globalCompositeOperation`.
- Test on a 4K display with 8–10 effects running before merging a PR.

## Known copies / attribution

Dock icons in `site-assets/mac-icons/` come from playground-macos and macos-web
(MIT). Demo wallpapers and effect assets are copyrighted by MacWall — do not
redistribute them commercially.
