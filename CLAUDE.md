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
  `hex-board.js` imports three.js r0.184 from unpkg and `./export/tiles3d.js` + `./export/pieces3d.js` (+ their `.expansion.js` siblings). These ship as real files next to `index.html` — they are **not** inlined.
- **Boundary contract:** `hex-board.js` sets `window.__hexBoard` and fires `hex-board-ready` on `document`. `ui.js` attaches via both (whichever wins). `ui.js` calls the board; the board never reads engine state directly except through the `S` object it's handed.

### 3D board API (`window.__hexBoard`)
- `setState(S)` — heavy; rebuild terrain/tokens/harbours/ocean. Call **once per new island** only.
- `refresh()` — cheap; **diffs** pieces against `S` and only touches what changed. New pieces drop in with a bounce + ground ripple; the robber hops between hexes. Call after **every** move.
- `pulse(total)` — flash the tokens and glow the tiles matching a dice roll.
- `setInsets({top,right,bottom,left}, {exact})` — reserve px for floating chrome; the island frames itself centred in the free rect (via `camera.setViewOffset`, so the horizon never tilts) and **eases** there. `exact:true` fits the real hex outline at the default angle (used in play); otherwise a bounding circle (used on the spinning menu). `setPanels(x,y,shift)` is a legacy wrapper.
- `resetView()` — glide back to the default angle + fitted zoom (double-click on the board does the same). `setSpin(radPerSec)` — idle orbit (menu/setup only).
- `toScreen(wx,wy,wz)` / `hexScreen(hid)` — project to screen px (used to fly payouts from tiles into the hand).
- `setPick(list, onPick)` / `clearPick()` — placement markers (see below).

Input: one finger orbits (with inertia), two fingers pinch, wheel zooms. Camera distance and framing are eased in `_frame()`; orbit is direct while dragging, then glides.

### Placement picking (how humans place on the 3D board)
`ui.js` `renderPick()` reads the engine's `settSpots/roadSpots/citySpots/shipSpots` for the current `mode`, projects each legal vertex/edge/hex to a DOM marker over the canvas via `board.setPick(...)`, and the marker click calls the **existing** `onVertexTap/onEdgeTap/onHexTap`. The engine's interaction model is reused untouched.
- Vertex markers carry a `label` (the spot's production: sum of pips on adjacent tiles) and a `title` (tiles + harbour).
- Hex picks (robber) also get a 3D highlight: eligible tiles glow, the hovered one fills, and a tap **anywhere on the tile** picks it (ray → ground plane → nearest hex). The small DOM target stays for keyboard/scripted clicks.
- `renderPick` caches by a signature (mode, robber, piece counts) so markers aren't rebuilt on every `renderAll`.

## File map

| File | Role | Inlined? |
| --- | --- | --- |
| `shell.html` | DOM: `<hex-board>` + screens + game chrome (top rail, command bar, popovers, toasts, dice stage) + modal sheet | yes |
| `style.css` | tokens, glass panels, screens, command bar, pick markers, dice, animations, layouts (wide / portrait / landscape) | yes |
| `game.js` | **engine + bot AI — do not edit for presentation** | yes |
| `gi.js` | game-icons.net SVG path data (`GI`) | yes |
| `ui.js` | screens, board glue, render*, all modals, setup, dice/toasts/fly-to-hand feedback, keyboard | yes |
| `hex-board.js` | `<hex-board>` 3D component (camera, input, ocean, lighting, tokens, piece animation, picking) | **no — module** |
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

> Full portable brief in **`DESIGN.md`** — paste that whole file (or its GitHub raw link) into any design session to convey the visual system without the repo. Summary below.

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
| players | 8 colours from `PLAYER_COLORS` (game.js) | (3D uses brightened `NEON` variants) |
| `--disp` | Yeseva One (Google Fonts) → Iowan Old Style / Palatino / Georgia | numbers, titles, VP, wordmark |
| `--sans` | Mulish (Google Fonts) → system stack | all UI text |
| `--ease` | `cubic-bezier(.2,.9,.25,1)` | standard easing |
| `--top-h / --bar-h` | set by `syncChrome()` | chrome footprint, for positioning overlays |

**Glass recipe** (`.glass`): `rgba(13,27,42,.74)` + `backdrop-filter: blur(16px) saturate(1.2)` + `--line` border + radius 14 + soft shadow. Denser surfaces go .82–.86.

**Radii:** 8 small controls · 9–10 cards/buttons · 12 chips/feed · 14 panels · 16 modals. **Easing:** `cubic-bezier(.2,.9,.25,1)`. Animations are prefixed `hh-*` (UI) and `hb-*` (board).

**Icons:** no emoji anywhere in the UI — Mark dislikes emoji and cross-platform rendering drift. Use `ico(name,size)` in `ui.js`: it prefers the rich game-icons.net silhouettes in `gi.js` at ≥13px and falls back to the geometric `ICONS` set. **Keep the game-icons.net attribution** (Lorc, Delapouite, Faithtoken, CC BY 3.0) in the How-to-play sheet.

**Typography/voice:** clean and quiet. Serif for display/numbers, sans for body. No hype.

## Board-first chrome (the layout — the island is the whole game)

The chrome is deliberately minimal so the 3D island owns the screen. `ui.js` `syncChrome()` measures the chrome after every render, publishes `--top-h` / `--bar-h` to CSS (popovers, hint and toasts position off them) and calls `board.setInsets(...)` so the island always frames itself in the free space. Three layouts share one DOM:

- **Top rail** (`.topbar`, transparent — only the pills catch the pointer): the **turn banner** (`#turnflag`: whose turn, what to do next, last dice, target), the **rivals** (`#opponents`), and the menu button (`#g-menu`).
- **Rivals** always show VP, hand size (red past 7 — robber bait) and dev cards; the active one gets a brass border + "thinking" dots. **Wide** (≥1100×600): full cards in a column on the right (adds knights, road length, badges) and the island reserves that column. **Narrow**: compact chips in the rail (own row on portrait).
- **Chronicle** (`#log`): 3 fading lines under the banner on wide screens; a one-line ticker on phones; tap to expand.
- **Bottom command bar** (`.cmdbar`, `#dock`): VP (`#bar-vp`, "of N" + bonus badges), the **hand** (`#hand` → 5 coloured `.rescard`s + a `.devcard` stack that opens `#devpop`), the **build actions** (`#buildpop` → `.act` with resource-chip costs, missing ones dimmed, pieces-left badge), **Trade**, and **one primary button** — Roll dice → End turn (`#btn-roll` / `#btn-end`, only one visible). It pulses when it's the obvious next move.
- **Build actions** sit inline in the bar on wide screens; below that they're a tray above the bar opened by **Build** (`#btn-build`). Picking an action auto-closes the tray so the island is clear for placement.
- **Hint pill** (`#hint`) sits just above the bar; in a cancellable placement mode it shows a **Cancel** button (Esc does the same).
- **Toasts** (`#toasts`) for things that happen *to you*: payouts, steals, monopolies, trades, new dev cards.
- **Dice stage** (`#dicebox`): two CSS 3D cubes tumble onto the rolled faces (`rollShow()`); the result then lives in the turn banner. Input is held (`busy`) while your own roll tumbles. Payouts then fly from the producing tiles into the hand (`flyGains()`).
- **Game menu** (`#gamemenu`): New island / Recenter view / Focus mode / How to play / Main menu. **Focus mode** toggles `body.panels-hidden` and reframes to fill the screen.
- **Keyboard**: Space/Enter primary (when no button has focus), 1–4 road/settlement/city/card, T trade, B build tray, D dev cards, F focus, C recenter, Esc cancel/close.
- Popover helpers live in `ui.js`: `togglePop/closePop/closePops`. The bar can collapse on portrait via the drag handle (`#dock-handle` → `setDockCollapsed`) to hide the hand row.
- Game timers go through `later()` and are all cancelled by `haltAll()` (menu, new game, resume, game over); `gameId` guards dice callbacks against a game that was left mid-roll.

## Mobile / camera (both orientations must work)

- **Board input** (`hex-board.js _bindInput`): **one finger = orbit, two fingers = pinch zoom.** Pointer releases are listened on `window` so a finger lifted off-canvas can't wedge it into permanent zoom (this was a real bug — don't reintroduce it by moving the listener back to the canvas). `_userZoom` suspends auto-framing after a manual zoom. A short tap (no drag) is a pick in hex-pick mode.
- Framing: `syncChrome()` (game) / `menuInsets()` (menu + setup, island pushed right of the card on desktop and slowly spinning) → `board.setInsets`. A debounced `resize` listener re-applies it.
- **Portrait:** rival chips scroll in a single row under the banner; the command bar wraps (VP + actions, then the hand). **Landscape phone:** one thin bar, icon-only Build/Trade, ticker log.

---

## How to work here

- **Presentation only** by default; leave `game.js` alone.
- **Verify in the browser before pushing.** Load http://localhost:8642, and prove the change: no console errors, and (for gameplay) resources stay conserved (bank + all hands == the starting bank per resource: 19 on a Standard map, more on Large/Huge). A quick automated soak (Playwright): script the human turns by clicking `window.__hexBoard._pickEls` markers and the real bar buttons (`#btn-roll`, `.act.ready`, `#devcard` → `#devpop .devchip.playable`, `#btn-trade`, `#btn-end`), handle modals by their sheet ids (`#dis-ok`, `.partner`, `#yop-ok`, `#mono`, `#bo-yes`, `#t-close`, `#go-menu`), wait while `busy` (dice tumbling), and assert conservation + no `pageerror` every step. Run once with `reducedMotion:'reduce'` (fast) and once with animations on.
- If unpkg is unreachable in a sandbox, serve three.js from npm (`npm pack three@0.184.0`) and route `unpkg.com/three@0.184.0/build/*` to it in the test browser — don't change the import URL.
- **Test both orientations and the 3D board on mobile** for any layout change.
- After editing source: `./build.sh` → verify → commit → `git push origin main` → the live URL updates.

## Provenance / gaps
- The 3D design came from the `Catan tiles 3D models.zip` handoff (`design_handoff_hexhaven_shell/`). Its `README.md` is the integration spec; `Hexhaven.dc.html` was reference-only and not copied.
- The desert art is dunes + cactus only (the old "robber baked into the desert" quirk is gone — the only robber is the real piece).
- Modals (discard / steal / Year of Plenty / Monopoly / trade / game-over) are glass sheets with resource chips; trade has one-tap bank swaps (`.qbtn`) above the give/get table. Refine freely, keeping their engine calls intact.
- Player colours: 8 (`PLAYER_COLORS` in `game.js`), each mapped to a brighter `NEON` hex in `hex-board.js` for the 3D glow.
