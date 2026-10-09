# Hexhaven — Design Brief

A portable, self-contained design system for **Hexhaven**, a Catan-style board game played against bots on a full-screen 3D island. Drop this whole file into any design session (design plugin, a claude.ai design chat, or a Claude Code session) and you have everything needed to design *on-brand* without seeing the code. Engineering details live in `CLAUDE.md`; this file is the visual + UX source of truth.

- **Live:** https://maronov-r.github.io/hexhaven/ · **Repo:** `maronov-r/hexhaven`
- **Raw link for pasting into other sessions:** https://raw.githubusercontent.com/maronov-r/hexhaven/main/DESIGN.md

---

## 1. What it is & who it's for

A premium, calm, single-player board game. The **3D island is the hero** — every UI decision defers to keeping the map visible and legible. Chrome floats over the board as translucent glass and gets out of the way (collapsible on mobile, a global "Focus mode"), and the camera always frames the island in whatever space the chrome leaves. One human vs 1–3 bots.

**Personality:** a quiet, well-made physical board game at dusk. Tactile, warm-in-the-cold, unhurried, premium. Not a flashy arcade game, not a corporate app.

## 2. Voice & tone

Clean and understated. Short labels, plain language, no hype, no exclamation marks, no emoji in the UI. Say what a control does ("Focus mode", "New island", "Start game"). Flavor is allowed but subtle ("A new island rises", "The island falls to a rival"). Never say "Catan" in anything user-facing — the game is Hexhaven (Catan is trademarked).

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

**Player colors:** eight — crimson `#e0555a`, azure `#4c9ee3`, ivory `#e8e4d8`, amber `#e58f3c`, teal `#3bb6a6`, violet `#9b6ee0`, rose `#e05ea6`, lime `#86c447`. On the 3D board these use brightened "neon" variants so the emissive glow reads — but **UI chrome always uses the flat colour**.

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
- **Water**: a ring of water hexes around the land, sitting in an open **ocean** that deepens and fades into the night background. The ocean has only a faint, slow swell — no glitter. Boats drift near harbours. Keep the sea calm — motion belongs to the land.
- **Lighting**: warm key sun with soft shadows, a sky/ground hemisphere fill, and a cool rim light from behind so low-poly facets read.
- **Pieces** are glowing low-poly models in the neon player colour. New pieces **drop in** with a small bounce and a ground ripple in the owner's colour, so a rival's move is noticed; the robber **hops** between tiles.

## 5. Typography

Two roles only.
- **Display** `--disp`: **Yeseva One** (Google Fonts), falling back to `"Iowan Old Style", Palatino, Georgia, serif`. Used for the wordmark, numbers, VP counts, dice totals, screen titles. Number tokens on the board use the Iowan/Palatino stack. Gives the premium board-game feel.
- **Body/UI** `--sans`: **Mulish** (Google Fonts), falling back to the system stack. Everything else.

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
- **Dice** — two 3D cubes tumble onto the rolled faces in the middle of the board, the total fades in, then the result moves to the turn banner (`hh-tumble` on the mini dice).
- **Payouts** — resource tiles fly from the producing hexes into the hand; the card bumps and glows brass on arrival.
- **Board** — pieces drop in (`outBack`), ground ripples, robber hop, producing tiles glow on a roll; the camera eases when reframing and glides after a flick.
- `hh-breathe` — loading crest.
- `hb-pop` — number token flashes on a matching roll.
Respect `prefers-reduced-motion` (all animation/transition disabled).

## 8. Iconography

**No emoji, ever.** Inline SVG only, for consistent cross-platform rendering. Two sets: rich game-icons.net silhouettes (used ≥13px) with a geometric fallback for tiny/chrome glyphs. **Keep the attribution** (game-icons.net — Lorc, Delapouite, Faithtoken, CC BY 3.0) in the How-to-play screen. Terrain art on tiles is 3D (three.js primitives), not icons.

## 9. Layout & components

**Five screens**, all keeping the island visible behind them: **loading** (crest + progress bar) → **menu** (wordmark + actions over a left-weighted scrim, island pushed right and slowly turning) → **setup** (glass card; the island re-deals live as you change options) → **how-to-play** → **game**.

**Game chrome** (floats over the board, all glass):
- **Turn banner** (top-left): whose turn, the next thing to do ("roll the dice", "build, trade or end"), the last dice, "First to N". Brass edge on your turn.
- **Rivals** (top-right column on desktop, chips in the top rail on phones): color stripe, name, VP (serif brass), hand size (turns red above 7), dev cards; desktop adds knights, road length and bonus badges. The active rival glows brass with "thinking" dots.
- **Chronicle** (under the banner): self-fading event feed, 3 lines on desktop, a one-line ticker on phones; expands on tap.
- **Command bar** (bottom, the only always-on panel): VP "of N" → the hand → build actions → Trade → **one primary button** that is Roll dice, then End turn.
- **Hint pill**: just above the bar, with **Cancel** while placing. **Toasts** (top centre) for what happens to you.

**Card & control anatomy:** resource card = a tile filled with its resource colour, white game-icon silhouette, serif count, tiny uppercase label; empty = desaturated. The dev-card stack is a dark brass card with a green dot when one is playable. Build action = label + cost as small resource-colour chips with white icons — chips you can't cover yet are dimmed, a corner badge shows pieces left; affordable actions get a brass edge. Placement markers: small glowing brass discs showing each spot's production number; edges are brass pills; robber targets light the whole tile. Segmented controls: equal-width buttons, selected = brass fill + brass-ink text. Selection borders are 2px brass.

## 10. Mobile (the map must stay the star)

Both orientations are first-class.
- **Portrait:** banner + menu on top, rival chips in their own row, a one-line event ticker; the command bar wraps (VP + Build / Trade / primary, then the hand) and has a grab handle to collapse the hand row. Build opens a tray above the bar.
- **Landscape:** banner and rival chips share one row; a single thin bar with icon-only Build/Trade.
- **Desktop / tablet landscape (≥1100×600):** rival cards in a right-hand column, build actions inline in the bar.
- **Board gestures:** one finger orbits; two fingers pinch-zoom and pan, tracking the fingers directly (no lag, no fling). Generous zoom-out so the whole island fits on a phone; zoom in and pan to read any corner.
- **Focus mode** clears the chrome entirely for a pure-map view.

## 11. Do / Don't

**Do:** keep the board visible and central; use `var(--*)` tokens, never raw hex; spend brass sparingly; serif for numbers/titles; quiet, literal copy; glass over the board; test both phone orientations.
**Don't:** add a light mode; introduce a second accent; use emoji in the UI; use pure grey neutrals; cover the map with opaque chrome; add hype/urgency/income-claim copy; call it Catan; hide the primary Roll/End button or Trade (they must always be reachable in the bar).

---

*Companion doc: `CLAUDE.md` (engineering — architecture, build, the 3D board contract, the "don't touch game.js" rule). Keep both in sync with the live site.*
