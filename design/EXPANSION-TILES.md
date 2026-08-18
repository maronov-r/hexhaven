# Hexhaven — Expansion Tiles: Design Handoff

**Purpose:** produce ~15 new 3D terrain tiles for four planned expansions, in the exact style of the existing island. **Art-first:** what each tile *yields* and its rules are TBD — build the tiles now; we wire meaning later. Tiles must stay **yield-agnostic** (no baked-in resource icons — number values are separate DOM tokens the board draws).

Companion docs: `DESIGN.md` (visual system), `CLAUDE.md` (architecture). Existing tiles live in `export/tiles3d.js`.

---

## Hand-off prompt (paste into a repo-aware Claude design session)

> **Task:** add ~15 new expansion terrain tiles to Hexhaven, matching the existing 3D island exactly. Art only — do not change game rules.
>
> **Read these first (they are in this repo):**
> - `export/tiles3d.js` — the tile builders. Match this precisely: three.js primitives only (no textures/images), flat-shaded `MeshStandardMaterial` via `mat()`/`makeMats()`, the same base-hex prism + cap (circumradius `R = 0.5`, must stay seam-compatible at 60° rotations), surface at `y ≈ 0`, `buildTile(THREE, kind, opts)` → `THREE.Group` honoring `opts.noToken`. Copy an existing builder such as `forest` or `mountains` as your pattern.
> - `hex-board.js` — `_registerLife()` animates tiles by scanning child mesh `.name`. Reuse the existing prefixes so your tiles animate for free (`canopy_*`, `grass_*`, `sheep_head_N`, `eagle_*`, `boat_*`, `lumberjack_*`+`axe_*`); for new motions use the new prefixes named per tile below.
> - `DESIGN.md` §4 (Terrain tiles) — the visual language and palette; `design/EXPANSION-TILES.md` (this file) — the full spec.
>
> **Build** every tile in [The tiles](#the-tiles). Keep them **yield-agnostic** (no resource icons baked in — meaning and number tokens live elsewhere) and near the current tiles' poly budget.
>
> **Deliver** a drop-in ES module `export/tiles3d.expansion.js` (no build step; imports nothing, is handed `THREE`) exposing the new `kind`s — either extend `buildTile`'s `BUILDERS` map or export `buildExpansionTile(THREE, kind, opts)` with the same shape. Add a short note listing the new `kind`s and any **new animation prefixes** you introduced, so `hex-board.js` `_registerLife`/`_frame` and the engine `KIND` map can be wired afterward.

---

## Style contract (match these exactly)

- **Tech:** three.js, primitives only. No textures, no image files, no external models. Flat-shaded `MeshStandardMaterial` via the existing `mat()`/`makeMats()` pattern; add new colors as more flat mats in the same family.
- **Base hex:** reuse the existing base prism + cap so seams tile. Circumradius `R = 0.5`; the tile must look correct at any of its six 60° rotations (the board spins each tile randomly). Surface top at `y ≈ 0`; props sit on top; player pieces rest at `y = 0.09`, so keep prop footprints off the six corners/edges where settlements and roads land.
- **Export:** a `THREE.Group` per tile, `g.name = 'catan_' + kind + '_tile'`, honoring `opts.noToken`. Either add cases to `buildTile`'s `BUILDERS` map or export `buildExpansionTile(THREE, kind, opts)` with the same shape.
- **Palette anchors (existing caps):** forest `#4e7c3a` · pasture `#6fae52` · fields `#b9924f` · hills `#a9683f` · mountain `#6d7566` · desert sand `#dec48c` · water `#2f7fae` / deep `#1d4f70` · bark `#5f4630` · foliage `#33632f`/`#477d3a`. New tiles pick grounds in this family (targets given per tile). Accent brass for "special" tiles: `#e0b15e`.
- **Shadows/scale:** the board sets castShadow/receiveShadow — just build clean geometry. Keep prop sizes consistent with existing trees/sheep. Keep triangle counts near the current tiles (the board renders ~37+).
- **Animation:** the board's `_registerLife()` (in `hex-board.js`) scans child mesh `.name` and animates known prefixes for free. **Reuse** where the motion exists; for genuinely new motion, use the **new prefix** noted per tile — those need a small matching branch added to `_registerLife`/`_frame` (list them in your delivery note so we wire them).

Existing reusable motion prefixes: `canopy_low_*`, `canopy_top_*`, `sapling_*` (sway) · `grass_*` (lean) · `sheep_head_N` / `sheep_cap_N` (head-dip) · `eagle_body` + `eagle_wing*` (orbit+flap) · `boat_hull` + `boat_*` (drift) · `lumberjack_torso`/`lumberjack_arm` + `axe_handle`/`axe_head` (chop).

---

## The tiles

### Batch 1 — Voyages (sea & isles)

| kind | Represents | Ground / palette | Props & silhouette | Motion (prefix) |
| --- | --- | --- | --- | --- |
| `gold` | **Gold Field** — the crown jewel; a wild "take any resource" | pale gravel `#cbb98a` with a braided **gold** riverbed `#e0b15e`/`#f0c778` | glinting gold nuggets in a shallow braided stream cutting the hex; a couple of prospector's sluice boxes | shimmer on the flecks — **new** `gold_flake_*` (subtle emissive twinkle) |
| `searoute` | **Deep-sea route** — a sailable lane, distinct from static ocean | deeper teal than `sea` (`#1d4f70` base, lighter lane) | a faint marked current lane across the hex; two small buoys at the edges | gentle wavelets — **new** `wave_*` (low bob); buoys reuse `boat_*` drift |
| `fog` | **Unexplored** — hides terrain until a ship reaches it, then flips | soft grey-white cloud over a hinted dark base | a low domed cloud bank covering the hex, edges wispy; the terrain beneath barely implied | drifting puffs — **new** `fog_puff_*` (slow horizontal drift + opacity breathe) |
| `isle` | **Small outer isle** — a 1-hex island base to grow the map | sandy rim `#dec48c` + a small grass crown `#6fae52` | a compact mound with a beach rim, a tuft of grass and one palm; meant to sit beyond the ring | palm fronds reuse `canopy_top_*` |

### Batch 2 — Wild terrains

| kind | Represents | Ground / palette | Props & silhouette | Motion (prefix) |
| --- | --- | --- | --- | --- |
| `volcano` | **Volcano** — ore-rich but erupts (roaming-hazard flavor); the showpiece | ash-grey basalt `#4a4640` slopes, dark scree | a central cone with a glowing crater, thin lava veins down one flank, scattered obsidian | rising smoke — **new** `volcano_smoke_*` (upward drift + fade) + crater glow pulse **new** `volcano_glow` |
| `oasis` | **Oasis / Springs** — wildcard or bonus-trade | warm desert sand `#dec48c` | a turquoise spring pool `#3fb0c4` ringed by reeds and 2–3 palms | palms reuse `canopy_top_*`; water glint **new** `oasis_glint` |
| `jungle` | **Jungle** — dense forest variant (lumber+) | deep foliage `#2f5a2c` floor, humid | layered tall canopies, hanging vines, one red tropical bloom for a pop | canopy reuse `canopy_low_*`/`canopy_top_*`; optional bird reuse scaled `eagle_*` |
| `swamp` | **Swamp / Bog** — yields nothing / hides a special | murky green-brown water `#3b4a34` + mud | cypress knees, tall reeds, a half-sunk log, low mist | reeds reuse `grass_*`; **new** `swamp_bubble_*` (slow rising bubbles) |

### Batch 3 — The Realm (worked land)
Variants of existing tiles with a structure signalling commodity production (Coin / Cloth / Paper — mapping TBD). Keep the parent terrain readable underneath.

| kind | Represents | Base | Added structure | Motion (prefix) |
| --- | --- | --- | --- | --- |
| `forest_mill` | **Sawmill** on forest → paper | reuse `forest` | a timber sawmill with a waterwheel at the tile edge; keep the pines | wheel turns — **new** `mill_wheel`; reuse `lumberjack_*` chop, `canopy_*` sway |
| `mountains_mine` | **Mine** on mountains → coin | reuse `mountains` | a pit-head headframe + adit and a small ore cart | pit wheel turns — **new** `mine_wheel`; reuse `eagle_*` |
| `pasture_weavery` | **Weavery** on pasture → cloth | reuse `pasture` | a weaver's cottage with a drying line of cloth | cloth flap — **new** `cloth_*`; reuse `sheep_head_N`, `grass_*` |
| `barbarian_sea` | **Barbarian sea** — the raider track edge | deep water | a menacing longship silhouette approaching on the horizon | slow approach — reuse `boat_*` with a darker hull |

### Batch 4 — Sites & Wonders
Small, self-contained flavor tiles (can sit on a neutral grass/stone base).

| kind | Represents | Base | Props & silhouette | Motion (prefix) |
| --- | --- | --- | --- | --- |
| `tradepost` | **Trade Post** — better rate nearby | neutral grass/stone | a dockside market stall / caravan with pennants and crates | pennants flutter — **new** `banner_*` |
| `ruins` | **Ruins** — one-time reward | mossy stone `#6d7566` | broken columns and a half-buried arch, moss and vines, a scatter of blocks | mostly static; optional drifting dust motes `banner_*`-style |
| `monument` | **Monument / Wonder** — build-toward-VP landmark | brass-accented stone plaza | a grand scaffolded obelisk or great-hall under construction; feels special (brass `#e0b15e` trim). Consider build-stage variants `monument_1/2/3` | static; optional flag `banner_*` |

---

## Integration checklist (for whoever wires it after art lands)

1. Add each `kind` to `buildTile` (or `buildExpansionTile`) — same Group/name/noToken contract.
2. Extend `hex-board.js` `KIND` map for any new **engine terrain** (base game maps `wood→forest, brick→hills, sheep→pasture, wheat→fields, ore→mountains, desert→desert`). Worked-land and site tiles may render via a per-hex overlay flag rather than a new engine terrain.
3. Add `_registerLife`/`_frame` branches for the new motion prefixes: `gold_flake_*`, `wave_*`, `fog_puff_*`, `volcano_smoke_*`, `volcano_glow`, `oasis_glint`, `swamp_bubble_*`, `mill_wheel`, `mine_wheel`, `cloth_*`, `banner_*`.
4. Keep tiles yield-agnostic; resource meaning + tokens stay in the engine/DOM layer.

## Parked rules questions (we design these next — not needed for art)

- **Voyages:** ship pieces & movement, building on/across water, island-hop settlement rules, Gold Field payout (choose-any), fog reveal trigger.
- **Wild:** each tile's yield (Volcano → ore + eruption behavior? Oasis → wild/trade? Jungle → lumber+? Swamp → nothing/peat special).
- **The Realm:** commodities (Coin/Cloth/Paper) from cities on mine/weavery/mill, city improvements, the barbarian track — this is the largest engine lift.
- **Sites:** Trade Post rate, Ruins reward, Monument VP cost/stages.
