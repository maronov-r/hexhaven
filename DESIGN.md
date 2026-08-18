# Hexhaven — Design Brief

A portable, self-contained design system for **Hexhaven**, a Catan-style board game played against bots on a full-screen 3D island. Drop this whole file into any design session (design plugin, a claude.ai design chat, or a Claude Code session) and you have everything needed to design *on-brand* without seeing the code. Engineering details live in `CLAUDE.md`; this file is the visual + UX source of truth.

- **Live:** https://maronov-r.github.io/hexhaven/ · **Repo:** `maronov-r/hexhaven`
- **Raw link for pasting into other sessions:** https://raw.githubusercontent.com/maronov-r/hexhaven/main/DESIGN.md

---

## 1. What it is & who it's for

A premium, calm, single-player board game. The **3D island is the hero** — every UI decision defers to keeping the map visible and legible. Chrome floats over the board as translucent glass and gets out of the way (collapsible on mobile, a global "Hide panels"). One human vs 1–3 bots.

**Personality:** a quiet, well-made physical board game at dusk. Tactile, warm-in-the-cold, unhurried, premium. Not a flashy arcade game, not a corporate app.

## 2. Voice & tone

Clean and understated. Short labels, plain language, no hype, no exclamation marks, no emoji in the UI. Say what a control does ("Hide panels", "New island", "Start game"). Flavor is allowed but subtle ("A new island rises", "The island falls to a rival"). Never say "Catan" in anything user-facing — the game is Hexhaven (Catan is trademarked).

## 3. Color

Theme name: **"night sea table."** A committed **dark theme only** (the 3D scene is lit for dark — there is no light mode). Deep teal ocean ground, warm brass as the single accent, blue-grey neutrals with a slight cool bias.

| Role | Token | Value |
| --- | --- | --- |
| Deepest ground | `--sea0` | `#081019` |
| Header / ocean base | `--sea1` | `#0d1b2a` |
| Panel surface | `--panel` | `#12233a` |
| Inset surface / input | `--panel2` | `#0f1e33` |
| Border (hairline) | `--line` | `rgba(154,190,225,.14)` |
| Border (emphasis) | `--line2` | `rgba(154,190,225,.28)` |
| Text — primary | `--ink` | `#eae4d3` (warm off-white) |
| Text — secondary | `--dim` | `#9fb0c2` |
| Text — labels/meta | `--faint` | `#6b7d92` |
| Quiet text (2 extra greys) | — | `#5d6e82`, `#4f6076` |
| **Accent** | `--brass` | `#e0b15e` |
| Accent hover | `--brass-hi` | `#f0c778` |
| Text on brass | `--brass-ink` | `#231a09` |
| Good / Bad (semantic only) | `--good` / `--bad` | `#7fc98a` / `#e07070` |

**Resource hues** (cards + cost dots): Lumber `--wood #2f6b45` · Brick `--brick #c4633f` · Wool `--sheep #8fbf6a` · Grain `--wheat #e2b84b` · Ore `--ore #7c8ca6`.

**Player colors:** `--p0 #e0555a` (red) · `--p1 #4c9ee3` (blue) · `--p2 #e8e4d8` (ivory) · `--p3 #e58f3c` (amber). On the 3D board these use brightened "neon" variants so the emissive glow reads (`#ff4d5e`, `#3fa9ff`, `#f2f0e6`, `#ffa32e`) — but **UI chrome always uses the flat `--p*`**.

**Rules:** brass is the *only* accent — spend it on VP, primary buttons, active states, focus. Semantic good/bad is not the accent. Neutrals are cool-biased on purpose; don't reach for pure grey.

## 4. Terrain tiles (the hero art)

Six terrain types, built as **low-poly 3D hexes** (three.js primitives, no textures) and lit for the dark scene. Each tile **breathes** — the ambient animation is what sells the island — and every hex is randomly rotated to one of its six orientations so seams tile cleanly.

| Terrain | Yields | Tile ground | Living detail |
| --- | --- | --- | --- |
| **Forest** | Lumber | `#2f6b45` | pines sway; a lumberjack chops |
| **Pasture** | Wool | `#7fae53` | sheep dip their heads in leaning grass |
| **Fields** | Grain | `#d0a53a` | rows of ripening wheat |
| **Hills** | Brick | `#a9553a` | red-clay pits and stacked brick |
| **Mountains** | Ore | `#6b7a94` | snow-capped peaks; an eagle circles |
| **Desert** | — (robber's home) | `#c9b48a` | dunes and cactus; static |

Engine→3D key mapping: `wood→forest, brick→hills, sheep→pasture, wheat→fields, ore→mountains, desert→desert`.

- **Number tokens** are DOM chips over the board (cream disc, serif value, probability pips). **6 and 8 are red** (`#a8321f`) as the high-odds numbers; all others `#4a3524`.
- **Harbours** sit on the water ring: **2:1** for a named resource, **3:1** for any.
- **The robber** parks on a tile and desaturates it (`saturate(.4) brightness(.62)`) to block its payout; it starts on the desert.
- **Water** is deliberately static; boats drift near harbours. Keep the sea calm — motion belongs to the land.
- *Known quirk:* the desert art has a robber figure baked in, so it shows even when the robber has moved — swap the desert model to fix.

## 5. Typography

Two roles only.
- **Display** `--disp`: `"Iowan Old Style", "Palatino Nova", Palatino, "Book Antiqua", Georgia, serif`. Used for the wordmark, numbers, VP counts, dice totals, screen titles, number tokens. Gives the premium board-game feel.
- **Body/UI** `--sans`: system stack (`-apple-system, "Segoe UI", Roboto, …`). Everything else.

Wordmark: `HEX` in `--ink`, `HAVEN` in `--brass`, wide letter-spacing (`.14–.22em`). Uppercase labels get `.09–.24em` tracking. Numbers that line up use `font-variant-numeric: tabular-nums` (`.num`).

## 6. Surfaces, radius, depth

**Glass panel** (every floating surface):
```css
background: rgba(13,27,42,.74);           /* denser variants .82–.86 */
backdrop-filter: blur(16px) saturate(1.2);
border: 1px solid var(--line);
border-radius: 14px;
box-shadow: 0 14px 34px rgba(0,0,0,.42);
```
**Radii:** 8 small controls · 9–10 cards/buttons · 12 chips/feed · 14 panels · 16 modal cards · 99px pills.
**Shadows:** chips `0 10px 24px rgba(0,0,0,.38)` · panels `0 14px 34px rgba(0,0,0,.42)` · modals `0 22px 54px rgba(0,0,0,.5)`.
**Opacity states:** disabled `.45` · inactive rival `.66` · idle chronicle `.2`.

## 7. Motion

Standard easing everywhere: `cubic-bezier(.2,.9,.25,1)`. Keep it purposeful — a few orchestrated moments, not constant movement (the living 3D board already provides ambient life).
- `hh-rise` — screens/panels enter (fade + 7–9px up).
- `hh-deal` — hand cards deal in, staggered 60ms.
- `hh-bump` — a resource card pulses brass when it gains.
- `hh-tumble` — dice on roll.
- `hh-breathe` — loading crest.
- `hb-pop` — number token flashes on a matching roll.
Respect `prefers-reduced-motion` (all animation/transition disabled).

## 8. Iconography

**No emoji, ever.** Inline SVG only, for consistent cross-platform rendering. Two sets: rich game-icons.net silhouettes (used ≥13px) with a geometric fallback for tiny/chrome glyphs. **Keep the attribution** (game-icons.net — Lorc, Delapouite, Faithtoken, CC BY 3.0) in the How-to-play screen. Terrain art on tiles is 3D (three.js primitives), not icons.

## 9. Layout & components

**Five screens**, all keeping the island visible behind them: **loading** (crest + progress bar) → **menu** (wordmark + actions over a left-weighted scrim, island pushed right) → **setup** (glass card; the island re-deals live as you change options) → **how-to-play** → **game**.

**Game chrome** (floats over the board, all glass):
- **Header** (top): crest, wordmark, turn pill, "First to N points", New island, Hide panels, menu.
- **Chronicle** (top-left): self-fading event feed; fades to .2 after ~4s idle, expands on click.
- **Rival strip** (bottom): one chip per bot — color-striped left edge, name, VP (serif brass), and a stat row (cards/dev/knights/road).
- **Dock** (right): your identity + VP, a hand of five resource cards (98px, colored top band, serif count), development cards, a 2×2 build grid with cost dots, and a fixed footer (Roll / Trade / End) that never scrolls.
- **Hint pill** + **dice panel**: centered in the free area (not the viewport center).

**Card & control anatomy:** resource card = colored 5px top band + serif count + tiny uppercase label; hover lifts and rotates slightly. Cost is shown as 9px rounded resource-colored dots. Segmented controls: equal-width buttons, selected = brass fill + brass-ink text. Selection borders are 2px brass.

## 10. Mobile (the map must stay the star)

Both orientations are first-class.
- **Portrait:** rival strip on top, board fills the middle, **dock is a draggable bottom sheet** with a grab handle — pull down to collapse to a slim action bar so the whole island shows, pull up to expand.
- **Landscape:** compact side dock on the right, board on the left.
- **Board gestures:** one finger orbits/looks around; two fingers pinch-zoom. Generous zoom-out so the whole island fits on a phone.
- **Hide panels** clears the chrome entirely for a pure-map view.

## 11. Do / Don't

**Do:** keep the board visible and central; use `var(--*)` tokens, never raw hex; spend brass sparingly; serif for numbers/titles; quiet, literal copy; glass over the board; test both phone orientations.
**Don't:** add a light mode; introduce a second accent; use emoji in the UI; use pure grey neutrals; cover the map with opaque chrome; add hype/urgency/income-claim copy; call it Catan; break the fixed dock footer (Roll/Trade/End must always be reachable).

---

*Companion doc: `CLAUDE.md` (engineering — architecture, build, the 3D board contract, the "don't touch game.js" rule). Keep both in sync with the live site.*
