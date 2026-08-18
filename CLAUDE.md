# CLAUDE.md — Hexhaven

Operating brief for the Hexhaven game. Read fully before changing anything. If something here is wrong or stale, fix the code AND update this file.

Hexhaven is a **personal project** (not part of Template Fever, despite living near it on disk). It is a complete **Catan-style board game** played against 1–3 bots, presented as a **full-screen 3D island**.

---

## Fast facts

- **Live:** https://maronov-r.github.io/hexhaven/  (GitHub Pages, public repo `maronov-r/hexhaven`, `main` branch, served from root; `index.html` is the built entry point).
- **Deploy:** commit + `git push origin main`. Pages redeploys in ~1 min. There is no CI.
- **Run locally:** `node serve.mjs` → http://localhost:8642 (static server with correct MIME for ES modules). Never use a different server that serves `.js` as `text/plain` — the browser will refuse to load the module.
- **Build:** `./build.sh` — concatenates the source into `index.html`. **Always run it after editing any source file**, then commit `index.html` + `hexhaven.html`.
- **Name:** always "Hexhaven", never "Catan" (trademark). Keep "Catan" out of user-facing text, titles, and store listings. It's fine in internal notes.

## The one rule that matters most

**Do not touch the rules engine.** `game.js` holds every rule, legality check, dice/robber/dev-card logic, longest-road/largest-army, win detection, AND the bot AI. It is correct and battle-tested (full games verified with perfect resource conservation). All work is **presentation only** unless a rule is genuinely wrong. If you think you need to change `game.js`, stop and confirm first.

---

## Architecture (why the build is multi-file)

The 3D board is an **ES module** that imports three.js. Classic scripts and the module live in **separate scopes** and talk across the boundary through `window` globals — this is intentional, not a smell.

- **Classic scripts** (shared global scope, inlined into `index.html` by `build.sh`, in order):
  `game.js` (engine + bots) → `gi.js` (icon path data) → `ui.js` (all presentation, screens, modals, board glue).
- **ES module** (loaded separately as `<script type="module" src="./hex-board.js">`):
  `hex-board.js` imports three.js r0.184 from unpkg and `./export/tiles3d.js` + `./export/pieces3d.js`. These three files ship as real files next to `index.html` — they are **not** inlined.
- **Boundary contract:** `hex-board.js` sets `window.__hexBoard` and fires `hex-board-ready` on `document`. `ui.js` attaches via both (whichever wins). `ui.js` calls the board; the board never reads engine state directly except through the `S` object it's handed.

### 3D board API (`window.__hexBoard`)
- `setState(S)` — heavy; rebuild terrain/tokens/harbours. Call **once per new island** only.
- `refresh()` — cheap; rebuild pieces/roads/robber. Call after **every** move.
- `pulse(total)` — flash tokens matching a dice roll.
- `setPanels(insetX, insetY, shiftPx)` — reframe the camera around floating chrome.
- `setPick(list, onPick)` / `clearPick()` — placement markers (see below).

### Placement picking (how humans place on the 3D board)
The handoff left this unwired. Solution: `ui.js` `renderPick()` reads the engine's `settSpots/roadSpots/citySpots` for the current `mode`, projects each legal vertex/edge/hex to a DOM marker over the canvas via `board.setPick(...)`, and the marker click calls the **existing** `onVertexTap/onEdgeTap/onHexTap`. The engine's interaction model is reused untouched; only the rendering of hit-targets moved from SVG to projected DOM.

## File map

| File | Role | Inlined? |
| --- | --- | --- |
| `shell.html` | DOM: `<hex-board>` + 5 screens + floating panels + modal sheet | yes |
| `style.css` | tokens, glass panels, screens, dock, pick markers, animations, mobile | yes |
| `game.js` | **engine + bot AI — do not edit for presentation** | yes |
| `gi.js` | game-icons.net SVG path data (`GI`) | yes |
| `ui.js` | screens, board glue, render*, all modals, setup, mobile dock | yes |
| `hex-board.js` | `<hex-board>` 3D component (camera, input, tokens, picking) | **no — module** |
| `export/tiles3d.js` | `buildTile(THREE, kind, opts)` terrain hexes | no — module |
| `export/pieces3d.js` | `buildPiece(THREE, kind, opts)` roads/settlements/cities/robber | no — module |
| `build.sh` | assembles `index.html` / `hexhaven.html` | — |
| `serve.mjs` | local static server, port 8642, correct MIME | — |
| `tiles.js` | **dead** — old flat-tile data URIs, no longer built | — |

## Screens & state

`ui.js` drives a screen machine via `document.body.dataset.screen`: `loading → menu → setup → rules → game`. The `<hex-board>` stays mounted behind all of them (the island loads once). Loading advances on two real milestones: engine ready + board ready. Setup re-deals the island live on layout/rivals/colour changes.

Persistence: `localStorage` keys `hexhaven-save-v1` (game) and `hexhaven-settings-v1` (prefs). `saveGame()`/`loadSettings()` own these.

---

## Design system (non-negotiable — this is a committed, single dark theme)

The look is **"night sea table"**: a dark teal ocean with a warm brass accent, serif display type, and translucent glass panels floating over a 3D island. It deliberately commits to one theme (no light mode) — the 3D scene is lit for dark.

**Tokens live in `style.css` `:root` — always use the `var(--*)`, never raw hex.**

| Token | Value | Use |
| --- | --- | --- |
| `--sea0 / --sea1` | `#081019` / `#0d1b2a` | deep background, header base |
| `--panel / --panel2` | `#12233a` / `#0f1e33` | panels, inset surfaces |
| `--line / --line2` | rgba blue-white .14 / .28 | borders |
| `--ink / --dim / --faint` | `#eae4d3` / `#9fb0c2` / `#6b7d92` | text tiers |
| `--brass / --brass-hi / --brass-ink` | `#e0b15e` / `#f0c778` / `#231a09` | accent, hover, text-on-brass |
| resource: `--wood --brick --sheep --wheat --ore` | greens/orange/etc | card + cost dots |
| players: `--p0..--p3` | red/blue/ivory/amber | (3D uses brightened `NEON` variants) |
| `--disp` | Iowan Old Style / Palatino / Georgia serif | numbers, titles, VP, wordmark |
| `--sans` | system stack | all UI text |

**Glass recipe** (`.glass`): `rgba(13,27,42,.74)` + `backdrop-filter: blur(16px) saturate(1.2)` + `--line` border + radius 14 + soft shadow. Denser surfaces go .82–.86.

**Radii:** 8 small controls · 9–10 cards/buttons · 12 chips/feed · 14 panels · 16 modals. **Easing:** `cubic-bezier(.2,.9,.25,1)`. Animations are prefixed `hh-*` (UI) and `hb-*` (board).

**Icons:** no emoji anywhere in the UI — Mark dislikes emoji and cross-platform rendering drift. Use `ico(name,size)` in `ui.js`: it prefers the rich game-icons.net silhouettes in `gi.js` at ≥13px and falls back to the geometric `ICONS` set. **Keep the game-icons.net attribution** (Lorc, Delapouite, Faithtoken, CC BY 3.0) in the How-to-play sheet.

**Typography/voice:** clean and quiet. Serif for display/numbers, sans for body. No hype.

## Mobile (both orientations must work — the map is the selling point)

- **Portrait:** rival strip on top, board fills the middle, dock is a **draggable bottom sheet** (`#dock-handle` → `setDockCollapsed`). Drag/tap the handle to collapse it to a slim bar so the whole island shows.
- **Landscape:** compact side dock on the right, board on the left.
- **Board input** (`hex-board.js _bindInput`): **one finger = orbit, two fingers = pinch zoom.** Pointer releases are listened on `window` so a finger lifted off-canvas can't wedge it into permanent zoom (this was a real bug — don't reintroduce it by moving the listener back to the canvas). `_userZoom` suspends auto-framing after a manual zoom.
- **Hide panels** button toggles `body.panels-hidden` (really hides dock + strip) and reframes the camera to fill the screen.
- Camera framing per screen/orientation is computed in `ui.js` `gameView()` / `menuView()`; a debounced `resize` listener re-applies it.

---

## How to work here

- **Presentation only** by default; leave `game.js` alone.
- **Verify in the browser before pushing.** Load http://localhost:8642, and prove the change: no console errors, and (for gameplay) resources stay conserved (19 of each across bank + all hands). A quick automated soak: script the human turns by clicking `window.__hexBoard._pickEls` markers + `onRoll`/`onEndTurn`, handle modals by their sheet ids, and assert `bank + hands == 19` per resource and `window.__err` is empty.
- **Test both orientations and the 3D board on mobile** for any layout change.
- After editing source: `./build.sh` → verify → commit → `git push origin main` → the live URL updates.

## Provenance / gaps
- The 3D design came from the `Catan tiles 3D models.zip` handoff (`design_handoff_hexhaven_shell/`). Its `README.md` is the integration spec; `Hexhaven.dc.html` was reference-only and not copied.
- Known cosmetic quirk: the desert tile art has a robber figure baked in, so it shows even when the robber is elsewhere. Swap the desert art to fix.
- Modals (discard / steal / Year of Plenty / Monopoly / trade / game-over) work and are glass-styled but were not part of the 3D redesign — refine freely, keeping their engine calls intact.
