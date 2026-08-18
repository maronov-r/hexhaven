# Hexhaven — Expansion Pieces: Design Handoff

**Purpose:** design the remaining player pieces for the expansions, in the exact style of the existing pieces (settlement / city / road / robber). The tiles are already built and integrated; these are the last art assets. **Art-first:** placement rules are TBD — build the pieces now, we wire them later. Only two expansions need new pieces at all.

Companion docs: `DESIGN.md` (visual system), `CLAUDE.md` (architecture). Existing pieces: `export/pieces3d.js`. New tiles: `export/tiles3d.expansion.js`.

---

## Hand-off prompt (paste into a repo-aware Claude design session)

> **Task:** add the expansion player pieces to Hexhaven, matching the existing pieces exactly. Art only — no rules changed.
>
> **Read first (in this repo):**
> - `export/pieces3d.js` — the piece builders. Match precisely: `buildPiece(THREE, kind, {color, glow, scale})` → `THREE.Group`, base resting at `y = 0`, scaled `1.3×` by default, glow on by default (emissive `paint`/`trim`/`lit` mats + additive halo shells so pieces read on any terrain). Pieces use the bright `PIECE_COLORS` (the board passes a player's neon color); the robber uses neutral `ROBBER_COLOR`. Copy `settlement`/`city`/`road` as your pattern.
> - `DESIGN.md` — visual language. Pieces sit on the tile surface at `y = 0.09`.
>
> **Build** every piece in "The pieces" below. Keep the glow (they must pop against greens/browns/sand/grey), keep footprints so land pieces sit on a vertex and the ship sits along a sea edge like a road. Poly budget near the existing pieces.
>
> **Deliver** a drop-in ES module `export/pieces3d.expansion.js` (no build step; imports nothing, is handed `THREE`) exposing the new kinds — either extend `pieces3d.js`'s `BUILDERS` map or export `buildExpansionPiece(THREE, kind, opts)` with the same shape. Reuse `PIECE_COLORS`/`ROBBER_COLOR`. Add a short note listing the new kinds and any opts you introduced (`rank`, `active`).

---

## Style contract (match `pieces3d.js`)

- `buildPiece(THREE, kind, {color, glow=true, scale=1.3})` → `THREE.Group`, `g.name = 'piece_' + kind`, base at `y = 0`.
- Materials via the existing `mats(THREE, color, glow)`: `piece_paint` (emissive body), `piece_trim` (dark 0.45× accent), `piece_lit` (pale warm highlight), plus additive `piece_glow` halo shells named `<mesh>_glow` (the board skips shadow-casting on `*_glow`).
- Land pieces sit on a vertex; the **ship** sits along a sea edge (oriented like a road). Keep silhouettes readable at board zoom.
- Primitives only, flat-shaded, no textures. Keep triangle counts in line with settlement/city.

---

## The pieces

### Voyages
| kind | opts | Represents | Silhouette |
| --- | --- | --- | --- |
| `ship` | — | a player's ship, placed on **sea edges** like a road is on land | a small sailing vessel: player-color hull with a dark `trim` waterline, one pale `lit` sail, a player-color pennant, a slight prow. Reads at road/settlement scale; oriented along the edge. |
| `pirate` *(optional)* | — | the sea's robber (neutral) | a menacing dark longship in `ROBBER_COLOR` (slate), low/no glow — the water counterpart to the robber. |

### The Realm (Cities & Knights)
| kind | opts | Represents | Silhouette |
| --- | --- | --- | --- |
| `knight` | `rank: 1\|2\|3`, `active: bool` (default true) | a knight; **3 ranks × active/inactive = 6 looks** from one builder | an armored figure on a small round shield-base, player-color with dark trim and a `lit` visor/blade highlight. **Rank** reads as height + crest: 1 = single plume, 2 = double plume, 3 = winged/horned crest (or 1/2/3 pips on the shield). **Active** = upright, banner raised, full glow; **inactive** = same figure, banner furled/lowered and glow dimmed (lower `emissiveIntensity`). Bake both states so it's legible in 3D, not just a tint. |
| `wall` | — | city wall (defense upgrade) | a low crenellated battlement arc that rings the base of a city — player-color stone with dark trim; short, sits under/around a `city` on its vertex. |
| `metropolis` | — | the metropolis (special upgraded city) | a grander city: taller, twin towers, a raised player-color banner — clearly outranks a normal `city`, same vertex footprint so it drops in place. |

**Not needed as 3D pieces** (they're UI or tile décor, I'll build them): the barbarian ship on its track, city-improvement markers, and the commodity counters.

---

## Integration notes (for wiring after art lands)
1. Add each kind to `buildExpansionPiece` (or `pieces3d.js` `BUILDERS`), same Group/name/scale/glow contract.
2. `hex-board.js` `_buildPieces()` will route: `ship` onto **sea edges** (same midpoint+rotation math as roads, but on water edges), `wall`/`metropolis` onto city vertices, `knight` onto its own placement (rules TBD). Pieces use the player's neon color exactly like settlements/cities/roads today.
3. `knight` reads `opts.rank`/`opts.active`; the board passes those from engine state when C&K rules exist.

## Parked rules (not needed for art)
- **Voyages:** ship building/movement along sea edges, island-hop settlements, pirate (if used) as a sea-robber.
- **The Realm:** knight activation/promotion/combat, the barbarian invasion track, commodities (Coin/Cloth/Paper) from mine/weavery/mill cities, city improvements, walls raising the discard limit, metropolis on a maxed improvement track.
