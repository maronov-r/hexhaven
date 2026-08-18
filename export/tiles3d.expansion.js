// Hexhaven — expansion terrain tiles (art only; no rules).
// Same contract as export/tiles3d.js: buildExpansionTile(THREE, kind, opts) → THREE.Group
// of named meshes, g.name = 'catan_<kind>_tile', honours opts.noToken.
// three.js primitives only, flat-shaded MeshStandardMaterial, same base prism + cap
// (R = 0.5, surface at TOP) so seams tile at every 60° rotation.
//
// Animation: every animatable mesh is a DIRECT child of the group, because
// hex-board.js _registerLife() scans tile.children (not a deep traverse).
// Reused prefixes animate for free. New prefixes are listed in NEW_ANIM_PREFIXES and
// driven by registerExpansionLife() / stepExpansionLife() at the bottom of this file.

const R = 0.5;              // hex circumradius
const BASE_H = 0.07;        // earth rim height
const CAP_H = 0.02;         // terrain cap
const TOP = BASE_H + CAP_H; // y of terrain surface

function mat(THREE, name, color, rough = 0.9, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: opts.metal ?? 0, flatShading: !!opts.flat });
  if (opts.emissive !== undefined) { m.emissive = new THREE.Color(opts.emissive); m.emissiveIntensity = opts.ei ?? 1; }
  if (opts.opacity !== undefined) { m.transparent = true; m.opacity = opts.opacity; m.depthWrite = false; }
  m.name = name;
  return m;
}

function makeMats(THREE) {
  return {
    // ---- existing island family (kept identical to export/tiles3d.js) ----
    earth: mat(THREE, 'earth', 0x8a6b45, 0.95, { flat: true }),
    deepWater: mat(THREE, 'deep_water', 0x1d4f70, 0.5, { flat: true }),
    capForest: mat(THREE, 'forest_floor', 0x4e7c3a, 0.95, { flat: true }),
    capPasture: mat(THREE, 'pasture_grass', 0x6fae52, 0.95, { flat: true }),
    capMountain: mat(THREE, 'alpine_ground', 0x6d7566, 0.95, { flat: true }),
    capDesert: mat(THREE, 'sand', 0xdec48c, 0.95, { flat: true }),
    water: mat(THREE, 'water', 0x2f7fae, 0.15, { flat: true }),
    waterLight: mat(THREE, 'water_light', 0x4899c4, 0.25),
    bark: mat(THREE, 'bark', 0x5f4630, 0.9),
    foliage: mat(THREE, 'foliage', 0x33632f, 0.95, { flat: true }),
    foliageLight: mat(THREE, 'foliage_light', 0x477d3a, 0.95, { flat: true }),
    meadow: mat(THREE, 'meadow', 0x5f9c46, 0.95),
    wool: mat(THREE, 'wool', 0xece7da, 1.0),
    sheepDark: mat(THREE, 'sheep_face', 0x40393a, 0.9),
    hay: mat(THREE, 'hay', 0xd8ab4e, 0.95),
    grassTip: mat(THREE, 'grass_tip', 0x7cbf5c, 0.95, { flat: true }),
    rock: mat(THREE, 'rock', 0x84868d, 0.95, { flat: true }),
    snow: mat(THREE, 'snow', 0xeef1f4, 0.8, { flat: true }),
    sandDune: mat(THREE, 'sand_dune', 0xd2b57a, 0.95),
    wood: mat(THREE, 'dock_wood', 0x77573a, 0.9, { flat: true }),
    woodLight: mat(THREE, 'crate_wood', 0x8d6a45, 0.9, { flat: true }),
    canvas: mat(THREE, 'sail_canvas', 0xe8e2d2, 0.9),
    rope: mat(THREE, 'rope', 0xcbb289, 1.0),
    skin: mat(THREE, 'skin', 0xd8a577, 0.9),
    shirt: mat(THREE, 'shirt_flannel', 0xa03a2c, 0.95),
    shirtHerder: mat(THREE, 'shirt_herder', 0x4a6e8a, 0.95),
    pants: mat(THREE, 'pants', 0x3f4453, 0.95),
    steel: mat(THREE, 'axe_steel', 0xb8bcc2, 0.4, { metal: 0.6 }),
    eagle: mat(THREE, 'eagle_feather', 0x4a3826, 0.9),
    eagleWhite: mat(THREE, 'eagle_head', 0xece7da, 0.9),
    beak: mat(THREE, 'beak', 0xd9a844, 0.7),
    token: mat(THREE, 'token', 0xe9dbb5, 0.85, { flat: true }),
    digitDark: mat(THREE, 'digit', 0x46342a, 0.8, { flat: true }),
    digitRed: mat(THREE, 'digit_red', 0xb03a2e, 0.8, { flat: true }),

    // ---- expansion additions, same flat family ----
    capGravel: mat(THREE, 'gravel_ground', 0x9d8f6a, 0.95, { flat: true }),
    gravelWet: mat(THREE, 'gravel_wet', 0x6f6247, 0.95, { flat: true }),
    shingle: mat(THREE, 'shingle_roof', 0x5c5f6a, 0.9, { flat: true }),
    goldSand: mat(THREE, 'gold_bed', 0xe0b15e, 0.85, { flat: true }),
    goldBright: mat(THREE, 'gold_bed_light', 0xf0c778, 0.8, { flat: true }),
    goldMetal: mat(THREE, 'gold_nugget', 0xf7d089, 0.30, { metal: 0.20, flat: true, emissive: 0x6b4a10, ei: 0.55 }),
    filmWater: mat(THREE, 'stream_film', 0x8fd0dd, 0.10, { opacity: 0.20 }),
    deeperWater: mat(THREE, 'deeper_water', 0x153c58, 0.5, { flat: true }),
    capShroud: mat(THREE, 'shroud_ground', 0x3a4450, 0.95, { flat: true }),
    shroudDark: mat(THREE, 'shroud_dark', 0x2c343e, 0.95, { flat: true }),
    cloud: mat(THREE, 'cloud', 0xdbe3ea, 0.95, { opacity: 0.8, flat: true }),
    capBasalt: mat(THREE, 'basalt_ground', 0x4a4640, 0.95, { flat: true }),
    scree: mat(THREE, 'scree', 0x3a3732, 0.95, { flat: true }),
    obsidian: mat(THREE, 'obsidian', 0x241f22, 0.35, { flat: true }),
    lava: mat(THREE, 'lava_vein', 0xd9622b, 0.6, { flat: true, emissive: 0x8f2f0c, ei: 0.9 }),
    lavaGlow: mat(THREE, 'lava_glow', 0xf0a24a, 0.5, { flat: true, emissive: 0xd9622b, ei: 1.0 }),
    smoke: mat(THREE, 'smoke', 0x8d8b86, 1.0, { opacity: 0.4, flat: true }),
    oasisWater: mat(THREE, 'spring_water', 0x3fb0c4, 0.12, { flat: true }),
    oasisDeep: mat(THREE, 'spring_deep', 0x2b8a9e, 0.15, { flat: true }),
    glint: mat(THREE, 'spring_glint', 0xd6f2f6, 0.1, { opacity: 0.35, flat: true }),
    reed: mat(THREE, 'reed', 0x6c8f4a, 0.95, { flat: true }),
    reedDry: mat(THREE, 'reed_dry', 0x77874a, 0.95, { flat: true }),
    capJungle: mat(THREE, 'jungle_floor', 0x2f5a2c, 0.95, { flat: true }),
    jungleLeaf: mat(THREE, 'jungle_leaf', 0x2b5c2a, 0.95, { flat: true }),
    jungleLeafLight: mat(THREE, 'jungle_leaf_light', 0x3d7a34, 0.95, { flat: true }),
    bloom: mat(THREE, 'bloom', 0xc4433f, 0.85, { flat: true }),
    capSwamp: mat(THREE, 'bog_water', 0x3b4a34, 0.35, { flat: true }),
    mud: mat(THREE, 'mud', 0x4a4030, 0.98, { flat: true }),
    bubble: mat(THREE, 'bog_bubble', 0xb9c6b0, 0.3, { opacity: 0.5, flat: true }),
    plaster: mat(THREE, 'plaster', 0xcbbca0, 0.95, { flat: true }),
    stone: mat(THREE, 'cut_stone', 0x8b8d86, 0.95, { flat: true }),
    stoneDark: mat(THREE, 'cut_stone_dark', 0x6f7269, 0.95, { flat: true }),
    moss: mat(THREE, 'moss', 0x4c6b3d, 0.98, { flat: true }),
    brass: mat(THREE, 'brass', 0xe0b15e, 0.35, { metal: 0.65, flat: true }),
    brassHi: mat(THREE, 'brass_hi', 0xf0c778, 0.3, { metal: 0.6, flat: true }),
    hullDark: mat(THREE, 'raider_hull', 0x2b2420, 0.9, { flat: true }),
    sailDark: mat(THREE, 'raider_sail', 0x8f3b2a, 0.9, { flat: true }),
    ironDark: mat(THREE, 'iron_dark', 0x4a4d54, 0.5, { metal: 0.5, flat: true }),
    pitShadow: mat(THREE, 'pit_shadow', 0x40200f, 1.0, { flat: true }),
  };
}

function add(THREE, g, geo, material, name, p = {}) {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(p.x ?? 0, p.y ?? 0, p.z ?? 0);
  if (p.rx) m.rotation.x = p.rx;
  if (p.ry) m.rotation.y = p.ry;
  if (p.rz) m.rotation.z = p.rz;
  if (p.s) m.scale.setScalar(p.s);
  if (p.sx !== undefined) m.scale.set(p.sx, p.sy ?? 1, p.sz ?? 1);
  g.add(m);
  return m;
}

// Translucent particles (smoke, mist, glints) must not cast shadows — a hard blob
// on a neighbouring hex reads as a bug. The board re-asserts castShadow = true on
// every mesh, so swallow that write here and flag it in userData for the engine.
function noShadow(m) {
  m.userData.noShadow = true;
  Object.defineProperty(m, 'castShadow', { get: () => false, set() {}, configurable: true });
  return m;
}

// triangular prism: length along local x, ridge apex up, flat base down
function prismGeo(THREE, rd, len) {
  const geo = new THREE.CylinderGeometry(rd, rd, len, 3, 1);
  geo.rotateY(Math.PI / 2);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

function hexBase(THREE, g, M, rimMat, capMat) {
  add(THREE, g, new THREE.CylinderGeometry(R, R, BASE_H, 6), rimMat, 'hex_rim', { y: BASE_H / 2 });
  add(THREE, g, new THREE.CylinderGeometry(R * 0.97, R * 0.985, CAP_H, 6), capMat, 'hex_cap', { y: BASE_H + CAP_H / 2 + 0.001 });
}

// ---- number token (7-segment digits + probability pips) ----
let SKIP_TOKEN = false;
const SEGPOS = { A: [0, -0.030, 'h'], B: [0.0195, -0.0155, 'v'], C: [0.0195, 0.0155, 'v'], D: [0, 0.030, 'h'], E: [-0.0195, 0.0155, 'v'], F: [-0.0195, -0.0155, 'v'], G: [0, 0, 'h'] };
const DIGSEG = { 2: 'ABGED', 3: 'ABGCD', 4: 'FGBC', 5: 'AFGCD', 6: 'AFGECD', 8: 'ABCDEFG', 9: 'ABFGCD' };

function addToken(THREE, g, M, digit, pips, red, x, z, ySurface) {
  if (SKIP_TOKEN) return;
  const tokH = 0.016, tokR = 0.085;
  add(THREE, g, new THREE.CylinderGeometry(tokR, tokR, tokH, 32), M.token, 'token', { x, y: ySurface + tokH / 2 + 0.001, z });
  const yd = ySurface + tokH + 0.003;
  const dm = red ? M.digitRed : M.digitDark;
  for (const s of DIGSEG[digit]) {
    const [sx, sz, o] = SEGPOS[s];
    const geo = o === 'h' ? new THREE.BoxGeometry(0.036, 0.006, 0.011) : new THREE.BoxGeometry(0.011, 0.006, 0.034);
    add(THREE, g, geo, dm, 'token_digit_' + s, { x: x + sx, y: yd, z: z + sz });
  }
  const start = -((pips - 1) / 2) * 0.014;
  for (let i = 0; i < pips; i++)
    add(THREE, g, new THREE.CylinderGeometry(0.0045, 0.0045, 0.005, 12), dm, 'token_pip_' + i, { x: x + start + i * 0.014, y: ySurface + tokH + 0.0025, z: z + 0.052 });
}

// ---- shared props ----

// simple standing figure: legs, torso, head, hat
function figure(THREE, g, M, x, z, ry, shirtMat, prefix) {
  const legH = 0.045, torsoH = 0.055;
  [[-0.011], [0.011]].forEach(([dx], l) =>
    add(THREE, g, new THREE.CylinderGeometry(0.009, 0.009, legH, 8), M.pants, prefix + '_leg_' + l,
      { x: x + Math.cos(ry) * dx, y: TOP + legH / 2, z: z - Math.sin(ry) * dx }));
  add(THREE, g, new THREE.CylinderGeometry(0.020, 0.024, torsoH, 10), shirtMat, prefix + '_torso', { x, y: TOP + legH + torsoH / 2, z });
  add(THREE, g, new THREE.SphereGeometry(0.017, 14, 10), M.skin, prefix + '_head', { x, y: TOP + legH + torsoH + 0.017, z });
  add(THREE, g, new THREE.CylinderGeometry(0.019, 0.021, 0.007, 10), M.bark, prefix + '_hat_brim', { x, y: TOP + legH + torsoH + 0.030, z });
  add(THREE, g, new THREE.CylinderGeometry(0.012, 0.014, 0.012, 10), M.bark, prefix + '_hat_top', { x, y: TOP + legH + torsoH + 0.039, z });
  return { armY: TOP + legH + torsoH * 0.8 };
}

// lumberjack + axe + stump, named exactly as forest so the chop animates for free
function lumberjack(THREE, g, M, lx, lz, lry) {
  const { armY } = figure(THREE, g, M, lx, lz, lry, M.shirt, 'lumberjack');
  add(THREE, g, new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), M.shirt, 'lumberjack_arm',
    { x: lx + Math.cos(lry) * 0.026, y: armY, z: lz - Math.sin(lry) * 0.026, rz: 0.9 });
  const ax = lx + Math.cos(lry) * 0.048, az = lz - Math.sin(lry) * 0.048;
  add(THREE, g, new THREE.CylinderGeometry(0.004, 0.004, 0.085, 8), M.bark, 'axe_handle', { x: ax, y: armY + 0.01, z: az, rz: 0.35 });
  add(THREE, g, new THREE.BoxGeometry(0.030, 0.018, 0.006), M.steel, 'axe_head', { x: ax + 0.015, y: armY + 0.048, z: az, rz: 0.35 });
  add(THREE, g, new THREE.CylinderGeometry(0.026, 0.030, 0.028, 10), M.bark, 'stump', { x: lx + 0.09, y: TOP + 0.014, z: lz + 0.05 });
  add(THREE, g, new THREE.CylinderGeometry(0.024, 0.024, 0.004, 10), M.woodLight, 'stump_top', { x: lx + 0.09, y: TOP + 0.030, z: lz + 0.05 });
}

function sheep(THREE, g, M, x, z, ry, i) {
  const y = TOP + 0.048;
  add(THREE, g, new THREE.SphereGeometry(0.045, 20, 14), M.wool, 'sheep_body_' + i, { x, y, z, ry, sx: 1.35, sy: 1, sz: 1.05 });
  const hx = x + Math.cos(ry) * 0.058, hz = z - Math.sin(ry) * 0.058;
  add(THREE, g, new THREE.SphereGeometry(0.026, 16, 12), M.sheepDark, 'sheep_head_' + i, { x: hx, y: y + 0.02, z: hz });
  add(THREE, g, new THREE.SphereGeometry(0.03, 12, 10), M.wool, 'sheep_cap_' + i, { x: hx - Math.cos(ry) * 0.012, y: y + 0.035, z: hz + Math.sin(ry) * 0.012 });
  for (let l = 0; l < 4; l++) {
    const fx = (l % 2 ? 0.028 : -0.028), fz = (l < 2 ? 0.02 : -0.02);
    add(THREE, g, new THREE.CylinderGeometry(0.007, 0.007, 0.035, 8), M.sheepDark, 'sheep_leg_' + i + '_' + l,
      { x: x + Math.cos(ry) * fx - Math.sin(ry) * fz, y: TOP + 0.017, z: z - Math.sin(ry) * fx - Math.cos(ry) * fz });
  }
}

function peak(THREE, g, M, x, z, r, h, snowy, i) {
  add(THREE, g, new THREE.ConeGeometry(r, h, 6), M.rock, 'peak_' + i, { x, y: TOP + h / 2, z, ry: i * 0.7 });
  if (snowy) {
    const hs = h * 0.32, rs = r * (hs / h) * 1.1;
    add(THREE, g, new THREE.ConeGeometry(rs, hs, 6), M.snow, 'snowcap_' + i, { x, y: TOP + h - hs / 2 + 0.002, z, ry: i * 0.7 });
  }
}

function pine(THREE, g, M, x, z, s, i, low = M.foliage, top = M.foliageLight) {
  const th = 0.09 * s, y0 = TOP;
  add(THREE, g, new THREE.CylinderGeometry(0.013 * s, 0.017 * s, th, 8), M.bark, 'trunk_' + i, { x, y: y0 + th / 2, z });
  add(THREE, g, new THREE.ConeGeometry(0.075 * s, 0.15 * s, 8), low, 'canopy_low_' + i, { x, y: y0 + th + 0.06 * s, z, ry: i });
  add(THREE, g, new THREE.ConeGeometry(0.055 * s, 0.12 * s, 8), top, 'canopy_top_' + i, { x, y: y0 + th + 0.145 * s, z, ry: i + 0.4 });
}

// broadleaf: two stacked flattened spheres, canopy_* so it sways with the pines
function broadleaf(THREE, g, M, x, z, s, i) {
  const th = 0.15 * s;
  add(THREE, g, new THREE.CylinderGeometry(0.012 * s, 0.018 * s, th, 8), M.bark, 'trunk_' + i, { x, y: TOP + th / 2, z });
  add(THREE, g, new THREE.SphereGeometry(0.085 * s, 12, 8), M.jungleLeaf, 'canopy_low_' + i,
    { x, y: TOP + th + 0.02 * s, z, sx: 1.15, sy: 0.55, sz: 1.05, ry: i });
  add(THREE, g, new THREE.SphereGeometry(0.062 * s, 12, 8), M.jungleLeafLight, 'canopy_top_' + i,
    { x, y: TOP + th + 0.055 * s, z, sx: 1.0, sy: 0.6, sz: 0.95, ry: i + 0.6 });
}

// palm: leaning trunk, fronds pivoted at the crown (canopy_top_* → free sway)
function palm(THREE, g, M, x, z, s, i, lean = 0.12) {
  const h = 0.16 * s;
  add(THREE, g, new THREE.CylinderGeometry(0.010 * s, 0.015 * s, h, 8), M.bark, 'palm_trunk_' + i,
    { x, y: TOP + h / 2, z, rz: lean });
  const cx = x - Math.sin(lean) * h, cy = TOP + Math.cos(lean) * h, cz = z;
  const IN = 0.072 * s, OUT = 0.080 * s;
  for (let k = 0; k < 5; k++) {
    const fan = k * (Math.PI * 2 / 5) + i, rise = 0.16 - (k % 2) * 0.06, droop = -0.70 - (k % 2) * 0.12;
    const gi = new THREE.ConeGeometry(0.019 * s, IN, 4);
    gi.rotateZ(-Math.PI / 2); gi.translate(IN / 2, 0, 0); gi.rotateZ(rise); gi.rotateY(fan);
    add(THREE, g, gi, k % 2 ? M.foliage : M.foliageLight, 'canopy_top_p' + i + '_' + k, { x: cx, y: cy, z: cz });
    const go = new THREE.ConeGeometry(0.013 * s, OUT, 4);
    go.rotateZ(-Math.PI / 2); go.translate(OUT / 2, 0, 0); go.rotateZ(droop);
    go.translate(Math.cos(rise) * IN, Math.sin(rise) * IN, 0); go.rotateY(fan);
    add(THREE, g, go, k % 2 ? M.foliageLight : M.foliage, 'canopy_top_p' + i + '_' + k + 't', { x: cx, y: cy, z: cz });
  }
  add(THREE, g, new THREE.SphereGeometry(0.013 * s, 8, 6), M.bark, 'palm_crown_' + i, { x: cx, y: cy, z: cz });
  [0.5, 2.7].forEach((a, k) =>
    add(THREE, g, new THREE.SphereGeometry(0.010 * s, 8, 6), M.bark, 'coconut_' + i + '_' + k,
      { x: cx + Math.cos(a) * 0.022 * s, y: cy - 0.010 * s, z: cz + Math.sin(a) * 0.022 * s }));
}

// short grass / reeds on a jittered grid — grass_* so the board can ripple it
function grassField(THREE, g, M, opts = {}) {
  const { r = 0.40, n = 9, span = 0.093, clear = [], mats = [M.meadow, M.grassTip], h = 0.032, jitter = 0.06, y = TOP } = opts;
  const rnd = (a, b) => { const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  const start = -((n - 1) / 2) * span;
  let k = 0;
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const j1 = rnd(row + 1, col + 1), j2 = rnd(col + 3, row + 7);
    const x = start + col * span + (j1 - 0.5) * jitter;
    const z = start + row * span + (j2 - 0.5) * jitter;
    if (Math.hypot(x, z) > r) continue;
    if (clear.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    const s = 0.75 + j1 * 0.7, bh = h * s;
    // origin at the blade's base so it stays planted and only the tip leans
    const blade = new THREE.ConeGeometry(0.010, bh, 5);
    blade.rotateY(j2 * 3);
    blade.translate(0, bh / 2, 0);
    add(THREE, g, blade, mats[k % mats.length], 'grass_' + k, { x, y, z });
    k++;
  }
  return k;
}

// soaring bird — eagle_* names, so _registerLife orbits and flaps it for free
function bird(THREE, g, M, gx, gy, gz, gry, s, bodyMat, headMat) {
  add(THREE, g, new THREE.SphereGeometry(0.016 * s, 14, 10), bodyMat, 'eagle_body', { x: gx, y: gy, z: gz, sx: 2.0 * s, sy: 0.75 * s, sz: 0.8 * s, ry: gry });
  add(THREE, g, new THREE.SphereGeometry(0.010 * s, 12, 8), headMat, 'eagle_head', { x: gx + Math.cos(gry) * 0.030 * s, y: gy + 0.004, z: gz - Math.sin(gry) * 0.030 * s });
  add(THREE, g, new THREE.ConeGeometry(0.004 * s, 0.010 * s, 6), M.beak, 'eagle_beak',
    { x: gx + Math.cos(gry) * 0.042 * s, y: gy + 0.004, z: gz - Math.sin(gry) * 0.042 * s, rz: -Math.PI / 2 * Math.cos(gry), rx: -Math.PI / 2 * Math.sin(gry) });
  [[1, 0], [-1, 1]].forEach(([side, i]) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.030 * s, 0.003, 0.085 * s), bodyMat);
    wing.name = 'eagle_wing_' + i;
    wing.position.set(gx - Math.sin(gry) * side * 0.048 * s, gy + 0.012 * side * 0.5 * s + 0.006 * s, gz - Math.cos(gry) * side * 0.048 * s);
    wing.rotation.set(side * 0.35 * Math.cos(gry), gry, side * 0.35 * Math.sin(gry));
    g.add(wing);
  });
  add(THREE, g, new THREE.BoxGeometry(0.028 * s, 0.003, 0.022 * s), headMat, 'eagle_tail', { x: gx - Math.cos(gry) * 0.034 * s, y: gy, z: gz + Math.sin(gry) * 0.034 * s, ry: gry });
}

// vertical spinning wheel: rim + spokes centred on the hub, all spun about local z
function wheel(THREE, g, M, prefix, x, y, z, rad, mtl, spokes = 3) {
  add(THREE, g, new THREE.TorusGeometry(rad, rad * 0.13, 6, 16), mtl, prefix, { x, y, z });
  for (let i = 0; i < spokes; i++)
    add(THREE, g, new THREE.BoxGeometry(rad * 2, rad * 0.13, rad * 0.12), mtl, prefix + '_spoke_' + i,
      { x, y, z, rz: (i * Math.PI) / spokes });
  add(THREE, g, new THREE.CylinderGeometry(rad * 0.16, rad * 0.16, rad * 0.5, 8), M.bark, prefix.replace('_wheel', '_hub'),
    { x, y, z, rx: Math.PI / 2 });
}

// pennant on a mast, pivoted at the mast (banner_* → flutter)
function pennant(THREE, g, M, i, x, y, z, ry, mtl, len = 0.055) {
  const sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.lineTo(len, 0.006); sh.lineTo(0, 0.026); sh.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.002, bevelEnabled: false });
  add(THREE, g, geo, mtl, 'banner_' + i, { x, y, z, ry });
}

// ================= Batch 1 — Voyages =================

function gold(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capGravel);
  // a damp channel cut across the hex, with two gold strands braiding through it
  add(THREE, g, new THREE.BoxGeometry(0.82, 0.005, 0.150), M.gravelWet, 'channel', { y: TOP + 0.002 });
  add(THREE, g, new THREE.BoxGeometry(0.80, 0.006, 0.056), M.goldSand, 'stream_0', { y: TOP + 0.004, z: -0.012, ry: 0.10 });
  add(THREE, g, new THREE.BoxGeometry(0.80, 0.006, 0.044), M.goldBright, 'stream_1', { y: TOP + 0.005, z: 0.014, ry: -0.13 });
  [[-0.26, 0.036, 0.9], [0.04, -0.030, 1.1], [0.29, 0.030, 0.8]].forEach(([x, z, s], i) =>
    add(THREE, g, new THREE.SphereGeometry(0.052, 12, 6), i % 2 ? M.goldBright : M.goldSand, 'gold_bar_' + i,
      { x, y: TOP + 0.003, z, sx: 1.5 * s, sy: 0.10, sz: 0.62 * s, ry: 0.2 * i }));
  noShadow(add(THREE, g, new THREE.BoxGeometry(0.80, 0.002, 0.126), M.filmWater, 'stream_film', { y: TOP + 0.009 }));
  // prospector's sluice boxes on the gravel bar
  [[-0.22, 0.22, 0.10], [0.24, -0.22, 0.10]].forEach(([sx, sz, ry], i) => {
    add(THREE, g, new THREE.BoxGeometry(0.15, 0.006, 0.062), M.wood, 'sluice_floor_' + i, { x: sx, y: TOP + 0.030, z: sz, ry, rz: 0.10 });
    [[-1], [1]].forEach(([side], k) =>
      add(THREE, g, new THREE.BoxGeometry(0.15, 0.020, 0.006), M.woodLight, 'sluice_rail_' + i + '_' + k,
        { x: sx - Math.sin(ry) * side * 0.031, y: TOP + 0.040, z: sz - Math.cos(ry) * side * 0.031, ry, rz: 0.10 }));
    [[-0.055], [0.055]].forEach(([dx], k) =>
      add(THREE, g, new THREE.CylinderGeometry(0.006, 0.006, 0.030, 6), M.wood, 'sluice_leg_' + i + '_' + k,
        { x: sx + Math.cos(ry) * dx, y: TOP + 0.015, z: sz - Math.sin(ry) * dx }));
  });
  // gold in the bed and in the sluice — gold_flake_* twinkle
  [[-0.31, 0.026, 0.015], [-0.12, -0.036, 0.012], [0.09, 0.030, 0.016], [0.27, -0.024, 0.013],
   [-0.22, 0.215, 0.010], [0.24, -0.225, 0.010]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.OctahedronGeometry(r, 0), M.goldMetal, 'gold_flake_' + i,
      { x, y: TOP + (i > 3 ? 0.038 : 0.008) + r * 0.6, z, ry: i }));
  [[-0.34, -0.25, 0.022], [0.33, 0.19, 0.018], [-0.10, 0.31, 0.015], [0.16, 0.30, 0.013],
   [-0.30, -0.13, 0.011], [0.09, -0.16, 0.012], [0.30, -0.10, 0.010], [-0.15, 0.14, 0.012],
   [0.24, 0.06, 0.009], [-0.05, -0.26, 0.014]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.rock, 'gravel_' + i, { x, y: TOP + r * 0.6, z, ry: i * 1.7 }));
  // tailings thrown up beside the workings
  [[-0.06, 0.25, 0.055], [0.13, -0.27, 0.045], [0.33, -0.03, 0.038]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.ConeGeometry(r, r * 0.5, 7), M.gravelWet, 'tailings_' + i, { x, y: TOP + r * 0.25, z, ry: i }));
  // a prospector working the bank with his pan
  const pgx = -0.30, pgz = 0.11, pgry = -1.1;
  const pf = figure(THREE, g, M, pgx, pgz, pgry, M.shirtHerder, 'prospector');
  add(THREE, g, new THREE.CylinderGeometry(0.007, 0.007, 0.042, 8), M.shirtHerder, 'prospector_arm',
    { x: pgx + Math.cos(pgry) * 0.024, y: pf.armY - 0.006, z: pgz - Math.sin(pgry) * 0.024, rz: 1.2 });
  add(THREE, g, new THREE.CylinderGeometry(0.024, 0.019, 0.010, 14), M.steel, 'gold_pan',
    { x: pgx + Math.cos(pgry) * 0.050, y: pf.armY - 0.022, z: pgz - Math.sin(pgry) * 0.050, rz: 0.12 });
  add(THREE, g, new THREE.CylinderGeometry(0.0035, 0.0035, 0.11, 6), M.bark, 'pick_handle', { x: -0.185, y: TOP + 0.048, z: 0.235, rz: 0.5 });
  add(THREE, g, new THREE.BoxGeometry(0.036, 0.007, 0.007), M.steel, 'pick_head', { x: -0.160, y: TOP + 0.096, z: 0.235, rz: 0.5 });
  addToken(THREE, g, M, 6, 5, true, -0.02, 0.31, TOP);
}

function searoute(THREE, g, M) {
  hexBase(THREE, g, M, M.deeperWater, M.deepWater);
  // marked current lane, edge to edge (hex is flat-sided at x = ±0.433)
  [[-0.075, M.water], [0, M.waterLight], [0.075, M.water]].forEach(([z, mtl], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.84, 0.002, 0.082), mtl, 'lane_' + i, { x: 0, y: TOP + 0.001, z }));
  // two buoys — boat_* so they drift with the current
  const buoy = (bx, bz, k, hullName) => {
    add(THREE, g, new THREE.CylinderGeometry(0.016, 0.026, 0.055, 8), k ? M.hullDark : M.sailDark, hullName, { x: bx, y: TOP + 0.027, z: bz });
    add(THREE, g, new THREE.SphereGeometry(0.016, 10, 8), M.canvas, 'boat_buoy_cap_' + k, { x: bx, y: TOP + 0.062, z: bz });
    add(THREE, g, new THREE.CylinderGeometry(0.0025, 0.0025, 0.045, 6), M.bark, 'boat_buoy_mast_' + k, { x: bx, y: TOP + 0.090, z: bz });
    add(THREE, g, new THREE.SphereGeometry(0.008, 8, 6), M.brass, 'boat_buoy_lamp_' + k, { x: bx, y: TOP + 0.116, z: bz });
  };
  buoy(0.23, -0.19, 0, 'boat_hull');
  buoy(-0.21, 0.17, 1, 'boat_buoy_body_1');
}

function fog(THREE, g, M) {
  hexBase(THREE, g, M, M.shroudDark, M.capShroud);
  // terrain barely implied under the bank
  add(THREE, g, new THREE.ConeGeometry(0.13, 0.085, 6), M.shroudDark, 'hidden_peak', { x: -0.10, y: TOP + 0.042, z: -0.06 });
  add(THREE, g, new THREE.SphereGeometry(0.13, 10, 8), M.shroudDark, 'hidden_lump', { x: 0.17, y: TOP, z: 0.14, sx: 1.3, sy: 0.4, sz: 1.05 });
  // one low dome, then an even ring of puffs softening its edge
  const bank = M.cloud.clone();
  bank.opacity = 0.64;
  noShadow(add(THREE, g, new THREE.SphereGeometry(0.30, 20, 12), bank, 'fog_bank', { y: TOP + 0.022, sx: 1.14, sy: 0.36, sz: 1.14 }));
  [[-0.19, -0.09, 0.130], [0.12, -0.20, 0.112], [0.21, 0.11, 0.124], [-0.11, 0.21, 0.108], [0.25, -0.07, 0.098]]
    .forEach(([x, z, r], i) => {
      const mtl = M.cloud.clone();
      mtl.opacity = i % 2 ? 0.46 : 0.54;
      noShadow(add(THREE, g, new THREE.SphereGeometry(r, 12, 8), mtl, 'fog_puff_' + i,
        { x, y: TOP + 0.028 + (i % 3) * 0.006, z, sx: 1.1, sy: 0.34, sz: 1.0, ry: i * 1.3 }));
    });
}

function isle(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capDesert);
  // foam ring on the beach ledge
  add(THREE, g, new THREE.CylinderGeometry(0.482, 0.482, 0.004, 6), M.sandDune, 'wet_sand', { y: TOP + 0.001 });
  // grass crown on a low mound
  add(THREE, g, new THREE.SphereGeometry(0.30, 18, 10), M.sandDune, 'mound_sand', { x: -0.01, y: TOP + 0.004, z: 0.01, sx: 1.0, sy: 0.13, sz: 0.92 });
  add(THREE, g, new THREE.SphereGeometry(0.205, 16, 10), M.capPasture, 'mound_grass', { x: 0.005, y: TOP + 0.018, z: -0.005, sx: 1.05, sy: 0.15, sz: 1.0 });
  const y0 = TOP + 0.048;
  palm(THREE, g, M, 0.04, -0.04, 1.0, 0, 0.16);
  palm(THREE, g, M, -0.11, 0.09, 0.62, 1, -0.22);
  grassField(THREE, g, M, { r: 0.155, n: 6, span: 0.062, h: 0.028, jitter: 0.05, y: TOP + 0.042, clear: [[0.04, -0.04, 0.055], [-0.11, 0.09, 0.045]], mats: [M.meadow, M.grassTip] })
  ;[[-0.34, 0.16, 0.026], [0.31, 0.23, 0.020], [0.36, -0.16, 0.017], [-0.20, -0.31, 0.014], [0.12, 0.35, 0.012], [-0.36, -0.09, 0.011]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.rock, 'shore_rock_' + i, { x, y: TOP + r * 0.5, z, ry: i * 1.3 }));
  [[0.20, -0.26], [0.26, -0.20]].forEach(([x, z], i) =>
    add(THREE, g, new THREE.SphereGeometry(0.011, 8, 6), M.bark, 'fallen_coconut_' + i, { x, y: TOP + 0.009, z }));
  add(THREE, g, new THREE.CylinderGeometry(0.016, 0.020, 0.105, 9), M.bark, 'driftwood', { x: -0.26, y: TOP + 0.010, z: 0.28, rz: Math.PI / 2, ry: 0.7 });
  void y0;
  addToken(THREE, g, M, 4, 3, false, 0, 0.31, TOP);
}

// ================= Batch 2 — Wild terrains =================

function volcano(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capBasalt);
  // cone with an open crater
  add(THREE, g, new THREE.CylinderGeometry(0.105, 0.30, 0.32, 6), M.scree, 'volcano_cone', { y: TOP + 0.16 });
  add(THREE, g, new THREE.CylinderGeometry(0.088, 0.098, 0.020, 6), M.obsidian, 'volcano_crater', { y: TOP + 0.318 });
  noShadow(add(THREE, g, new THREE.CylinderGeometry(0.074, 0.074, 0.006, 6), M.lavaGlow, 'volcano_glow', { y: TOP + 0.327 }));
  // lava veins down one flank
  [[0.188, 0, 0.26], [0.172, 0.075, 0.21]].forEach(([rad, dz, len], i) => {
    add(THREE, g, new THREE.BoxGeometry(0.011, len, 0.007), M.lava, 'lava_vein_' + i,
      { x: rad, y: TOP + 0.145, z: dz, rz: 0.56 });
  });
  [[-0.33, -0.12, 0.028], [0.24, 0.30, 0.022], [0.35, -0.19, 0.024]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.obsidian, 'obsidian_' + i, { x, y: TOP + r * 0.6, z, ry: i * 1.9 }));
  [[-0.16, 0.33, 0.015], [0.15, -0.34, 0.013], [-0.36, 0.06, 0.014], [0.36, 0.09, 0.012],
   [-0.05, 0.37, 0.011], [-0.30, -0.24, 0.013], [0.28, -0.28, 0.010], [0.05, -0.37, 0.012],
   [-0.38, -0.06, 0.009], [0.20, 0.34, 0.011]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.scree, 'scree_' + i, { x, y: TOP + r * 0.6, z, ry: i }));
  // two side vents glowing at the foot of the cone
  [[-0.34, 0.17], [0.31, -0.25]].forEach(([x, z], i) => {
    add(THREE, g, new THREE.CylinderGeometry(0.026, 0.034, 0.016, 7), M.obsidian, 'vent_' + i, { x, y: TOP + 0.008, z });
    noShadow(add(THREE, g, new THREE.CylinderGeometry(0.019, 0.019, 0.005, 7), M.lavaGlow, 'vent_glow_' + i, { x, y: TOP + 0.017, z }));
  });
  // rising smoke
  for (let i = 0; i < 6; i++) {
    const mtl = M.smoke.clone();
    noShadow(add(THREE, g, new THREE.SphereGeometry(0.045 + (i % 3) * 0.012, 10, 8), mtl, 'volcano_smoke_' + i,
      { x: (i % 2 ? 0.02 : -0.015), y: TOP + 0.35, z: (i % 3 === 0 ? 0.02 : -0.018), sx: 1.0, sy: 0.8, sz: 1.0 }));
  }
  addToken(THREE, g, M, 3, 2, false, -0.02, 0.33, TOP);
}

function oasis(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capDesert);
  [[-0.22, -0.17, 0.14], [0.23, 0.19, 0.12], [0.25, -0.22, 0.10]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.SphereGeometry(r, 18, 12), M.sandDune, 'dune_' + i, { x, y: TOP + 0.006, z, sx: 1.5, sy: 0.30, sz: 1.05 }));
  // spring pool
  const px = -0.02, pz = 0.02;
  const rim = add(THREE, g, new THREE.TorusGeometry(0.155, 0.020, 6, 22), M.sandDune, 'pool_rim', { x: px, y: TOP + 0.004, z: pz });
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1, 0.55);
  add(THREE, g, new THREE.CylinderGeometry(0.152, 0.152, 0.008, 22), M.oasisWater, 'pool_water', { x: px, y: TOP + 0.004, z: pz });
  add(THREE, g, new THREE.CylinderGeometry(0.092, 0.092, 0.006, 18), M.oasisDeep, 'pool_deep', { x: px, y: TOP + 0.007, z: pz });
  const glint = add(THREE, g, new THREE.TorusGeometry(0.105, 0.007, 5, 20), M.glint, 'oasis_glint', { x: px, y: TOP + 0.010, z: pz });
  glint.rotation.x = Math.PI / 2;
  noShadow(glint);
  grassField(THREE, g, M, {
    r: 0.34, n: 8, span: 0.088, h: 0.046, mats: [M.reed, M.reedDry, M.meadow],
    clear: [[px, pz, 0.15], [-0.21, 0.24, 0.09], [0.21, -0.20, 0.09], [0.25, 0.26, 0.09]],
  });
  palm(THREE, g, M, -0.21, 0.24, 1.0, 0, 0.20);
  palm(THREE, g, M, 0.21, -0.20, 0.85, 1, -0.14);
  palm(THREE, g, M, 0.25, 0.26, 0.7, 2, 0.08);
  [[-0.32, 0.06, 0.020], [0.30, 0.02, 0.016]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.rock, 'oasis_rock_' + i, { x, y: TOP + r * 0.6, z, ry: i * 2 }));
  addToken(THREE, g, M, 9, 4, false, 0, 0.33, TOP);
}

function jungle(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capJungle);
  [[-0.24, -0.18, 1.15, 0], [0.05, -0.28, 1.0, 1], [0.26, -0.10, 1.1, 2],
   [-0.30, 0.14, 0.95, 3], [0.02, 0.02, 1.25, 4], [0.24, 0.24, 1.0, 5]].forEach(([x, z, s, i]) =>
    broadleaf(THREE, g, M, x, z, s, i));
  pine(THREE, g, M, -0.06, 0.30, 0.8, 6, M.jungleLeaf, M.jungleLeafLight);
  // hanging vines (sapling_* → soft sway)
  [[-0.18, -0.10, 0.10], [0.14, -0.20, 0.085], [0.16, 0.14, 0.095], [-0.24, 0.24, 0.075]].forEach(([x, z, h], i) =>
    add(THREE, g, new THREE.CylinderGeometry(0.0035, 0.0025, h, 5), M.jungleLeafLight, 'sapling_vine_' + i,
      { x, y: TOP + 0.20 - h / 2, z }));
  // one red bloom for the pop
  add(THREE, g, new THREE.SphereGeometry(0.024, 10, 8), M.bloom, 'bloom_head', { x: -0.12, y: TOP + 0.075, z: -0.02, sx: 1.0, sy: 0.7, sz: 1.0 });
  add(THREE, g, new THREE.CylinderGeometry(0.004, 0.004, 0.065, 6), M.jungleLeafLight, 'bloom_stem', { x: -0.12, y: TOP + 0.033, z: -0.02 });
  [[0.10, 0.32, 0.013], [-0.34, -0.02, 0.011]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.SphereGeometry(r, 8, 6), M.bloom, 'bud_' + i, { x, y: TOP + 0.03, z, sx: 1.0, sy: 0.8, sz: 1.0 }));
  grassField(THREE, g, M, {
    r: 0.36, n: 8, span: 0.090, h: 0.040, mats: [M.jungleLeafLight, M.foliage, M.meadow],
    clear: [[-0.12, -0.02, 0.06]],
  });
  bird(THREE, g, M, 0.17, TOP + 0.30, 0.05, 0.7, 0.62, M.eagle, M.eagleWhite);
  addToken(THREE, g, M, 5, 4, false, 0, 0.33, TOP);
}

function swamp(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capSwamp);
  [[-0.20, -0.14, 0.15], [0.21, 0.12, 0.13], [0.05, 0.26, 0.10], [-0.25, 0.19, 0.09]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.SphereGeometry(r, 14, 10), M.mud, 'mud_bar_' + i, { x, y: TOP + 0.002, z, sx: 1.4, sy: 0.16, sz: 1.05 }));
  // cypress knees
  [[-0.14, -0.06, 0.036], [-0.04, -0.15, 0.028], [0.03, -0.02, 0.044], [0.19, 0.03, 0.028]].forEach(([x, z, h], i) =>
    add(THREE, g, new THREE.ConeGeometry(0.016, h, 6), M.bark, 'knee_' + i, { x, y: TOP + h / 2, z, ry: i }));
  // half-sunk log
  add(THREE, g, new THREE.CylinderGeometry(0.022, 0.026, 0.22, 8), M.bark, 'sunk_log', { x: 0.16, y: TOP + 0.012, z: -0.24, rz: Math.PI / 2, ry: 0.7, rx: 0.06 });
  add(THREE, g, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6), M.bark, 'log_branch', { x: 0.24, y: TOP + 0.030, z: -0.20, rz: 0.9, ry: 0.4 });
  // one cypress for silhouette
  const th = 0.13;
  add(THREE, g, new THREE.CylinderGeometry(0.014, 0.026, th, 8), M.bark, 'trunk_0', { x: -0.24, y: TOP + th / 2, z: -0.22 });
  add(THREE, g, new THREE.ConeGeometry(0.085, 0.10, 8), M.foliage, 'canopy_low_0', { x: -0.24, y: TOP + th + 0.04, z: -0.22 });
  add(THREE, g, new THREE.ConeGeometry(0.055, 0.09, 8), M.jungleLeaf, 'canopy_top_0', { x: -0.24, y: TOP + th + 0.10, z: -0.22, ry: 0.5 });
  grassField(THREE, g, M, {
    r: 0.37, n: 9, span: 0.088, h: 0.058, mats: [M.reed, M.reedDry, M.foliage],
    clear: [[-0.24, -0.22, 0.10], [0.16, -0.24, 0.10], [0.02, -0.03, 0.06]],
  });
  // slow rising bubbles
  [[-0.10, 0.12], [0.10, 0.20], [-0.02, -0.20], [0.28, -0.06], [-0.30, -0.02]].forEach(([x, z], i) => {
    const mtl = M.bubble.clone();
    noShadow(add(THREE, g, new THREE.SphereGeometry(0.010 + (i % 3) * 0.003, 8, 6), mtl, 'swamp_bubble_' + i, { x, y: TOP + 0.006, z }));
  });
  // low mist — reuses the fog_puff_* motion
  [[-0.16, 0.21, 0.10], [0.17, -0.10, 0.09]].forEach(([x, z, r], i) => {
    const mtl = M.cloud.clone();
    mtl.opacity = 0.10 + i * 0.02;
    noShadow(add(THREE, g, new THREE.SphereGeometry(r, 10, 8), mtl, 'fog_puff_' + i, { x, y: TOP + 0.055, z, sx: 1.3, sy: 0.22, sz: 1.0, ry: i }));
  });
}

// ================= Batch 3 — The Realm =================

function forest_mill(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capForest);
  [[-0.30, -0.20, 1.1, 0], [-0.06, -0.31, 1.0, 1], [0.20, -0.24, 1.2, 2],
   [0.34, -0.02, 0.9, 3], [-0.36, -0.06, 0.95, 4], [-0.14, -0.08, 1.05, 5]].forEach(([x, z, s, i]) =>
    pine(THREE, g, M, x, z, s, i));
  add(THREE, g, new THREE.ConeGeometry(0.014, 0.035, 5), M.foliageLight, 'sapling_0', { x: 0.14, y: TOP + 0.017, z: 0.02 });
  lumberjack(THREE, g, M, 0.06, 0.14, -0.6);
  // sawmill at the tile edge, waterwheel outboard
  const mx = -0.10, mz = 0.235, wh = 0.075, hw = 0.075, hd = 0.062;
  add(THREE, g, new THREE.BoxGeometry(hw * 2, wh, hd * 2), M.wood, 'mill_wall', { x: mx, y: TOP + wh / 2, z: mz });
  const roof = add(THREE, g, prismGeo(THREE, hd * 0.9, hw * 2 + 0.01), M.shingle, 'mill_roof', { x: mx, y: TOP + wh + 0.022, z: mz });
  roof.scale.set(1, 0.7, 0.95);
  add(THREE, g, new THREE.BoxGeometry(0.004, 0.040, 0.030), M.bark, 'mill_door', { x: mx + hw + 0.002, y: TOP + 0.020, z: mz });
  // sluice feeding the wheel
  add(THREE, g, new THREE.BoxGeometry(0.10, 0.008, 0.045), M.woodLight, 'mill_sluice', { x: mx - 0.13, y: TOP + 0.085, z: mz, rz: 0.14 });
  [[-1], [1]].forEach(([side], i) =>
    add(THREE, g, new THREE.CylinderGeometry(0.005, 0.005, 0.085, 6), M.wood, 'mill_post_' + i, { x: mx - 0.13, y: TOP + 0.042, z: mz + side * 0.026 }));
  wheel(THREE, g, M, 'mill_wheel', mx - 0.185, TOP + 0.062, mz, 0.058, M.woodLight, 3);
  // cut timber
  for (let i = 0; i < 3; i++)
    add(THREE, g, new THREE.CylinderGeometry(0.020, 0.020, 0.13, 8), M.bark, 'log_' + i,
      { x: 0.30, y: TOP + 0.020 + (i === 2 ? 0.034 : 0), z: 0.16 + (i === 2 ? 0.021 : i * 0.042), rz: Math.PI / 2, ry: 0.1 });
  add(THREE, g, new THREE.BoxGeometry(0.075, 0.006, 0.055), M.woodLight, 'plank_stack', { x: 0.10, y: TOP + 0.005, z: 0.30, ry: 0.3 });
  addToken(THREE, g, M, 4, 3, false, -0.02, -0.34, TOP);
}

function mountains_mine(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capMountain);
  peak(THREE, g, M, -0.20, -0.12, 0.16, 0.27, true, 0);
  peak(THREE, g, M, 0.15, -0.26, 0.12, 0.19, true, 1);
  peak(THREE, g, M, 0.03, 0.09, 0.085, 0.11, false, 2);
  [[-0.35, 0.22, 0.024], [0.34, -0.06, 0.019]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.rock, 'boulder_' + i, { x, y: TOP + r * 0.7, z, ry: i * 1.3 }));
  // adit into the base of the big peak
  const ax = -0.20, az = 0.03;
  add(THREE, g, new THREE.CylinderGeometry(0.032, 0.032, 0.012, 12, 1, false, 0, Math.PI), M.pitShadow, 'adit_mouth', { x: ax, y: TOP + 0.030, z: az, rx: Math.PI / 2 });
  [[-1], [1]].forEach(([side], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.008, 0.048, 0.008), M.bark, 'adit_post_' + i, { x: ax + side * 0.034, y: TOP + 0.024, z: az }));
  add(THREE, g, new THREE.BoxGeometry(0.084, 0.009, 0.010), M.bark, 'adit_lintel', { x: ax, y: TOP + 0.052, z: az });
  // pit-head headframe
  const hx = 0.19, hz = 0.19, hh = 0.16;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) =>
    add(THREE, g, new THREE.CylinderGeometry(0.005, 0.006, hh, 6), M.bark, 'frame_leg_' + i,
      { x: hx + sx * 0.045, y: TOP + hh / 2, z: hz + sz * 0.045, rz: -sx * 0.13, rx: sz * 0.13 }));
  add(THREE, g, new THREE.BoxGeometry(0.075, 0.008, 0.075), M.bark, 'frame_cap', { x: hx, y: TOP + hh, z: hz });
  add(THREE, g, new THREE.BoxGeometry(0.088, 0.006, 0.006), M.bark, 'frame_brace', { x: hx, y: TOP + hh * 0.55, z: hz - 0.045 });
  wheel(THREE, g, M, 'mine_wheel', hx, TOP + hh + 0.030, hz, 0.028, M.ironDark, 2);
  add(THREE, g, new THREE.CylinderGeometry(0.0025, 0.0025, 0.055, 5), M.rope, 'hoist_rope', { x: hx, y: TOP + hh + 0.002, z: hz });
  // ore cart on a short rail
  const cx = -0.06, cz = 0.31;
  [[-0.020], [0.020]].forEach(([dz], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.16, 0.004, 0.006), M.ironDark, 'rail_' + i, { x: cx, y: TOP + 0.002, z: cz + dz, ry: 0.15 }));
  add(THREE, g, new THREE.BoxGeometry(0.058, 0.032, 0.046), M.wood, 'cart_body', { x: cx, y: TOP + 0.028, z: cz, ry: 0.15 });
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) =>
    add(THREE, g, new THREE.CylinderGeometry(0.010, 0.010, 0.005, 10), M.ironDark, 'cart_wheel_' + i,
      { x: cx + sx * 0.022, y: TOP + 0.010, z: cz + sz * 0.020, rx: Math.PI / 2, ry: 0.15 }));
  [[0.02, 0.010], [-0.01, 0.008], [0.04, 0.007]].forEach(([dx, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.stoneDark, 'ore_' + i, { x: cx + dx, y: TOP + 0.048, z: cz + (i - 1) * 0.012, ry: i }));
  bird(THREE, g, M, 0.14, TOP + 0.40, 0.02, 0.7, 1.0, M.eagle, M.eagleWhite);
  addToken(THREE, g, M, 8, 5, true, -0.24, -0.30, TOP);
}

function pasture_weavery(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capPasture);
  const cx = 0.20, cz = -0.20, lineZ = 0.20;
  grassField(THREE, g, M, {
    r: 0.39, n: 9, span: 0.093, h: 0.032,
    mats: [M.meadow, M.grassTip, M.meadow],
    clear: [[-0.12, -0.06, 0.11], [-0.32, 0.02, 0.11], [-0.06, -0.28, 0.11], [cx, cz, 0.17], [-0.09, lineZ, 0.14]],
  });
  sheep(THREE, g, M, -0.12, -0.06, 0.5, 0);
  sheep(THREE, g, M, -0.32, 0.02, -1.2, 1);
  sheep(THREE, g, M, -0.06, -0.28, 2.3, 2);
  // weaver's cottage
  const hw = 0.072, hd = 0.058, wh = 0.070;
  add(THREE, g, new THREE.BoxGeometry(hw * 2, wh, hd * 2), M.plaster, 'cottage_wall', { x: cx, y: TOP + wh / 2, z: cz, ry: -0.35 });
  const roof = add(THREE, g, prismGeo(THREE, hd * 0.95, hw * 2 + 0.014), M.hay, 'cottage_roof', { x: cx, y: TOP + wh + 0.024, z: cz, ry: -0.35 });
  roof.scale.set(1, 0.78, 1.0);
  add(THREE, g, new THREE.BoxGeometry(0.004, 0.040, 0.026), M.bark, 'cottage_door',
    { x: cx + Math.cos(-0.35) * (hw + 0.002), y: TOP + 0.020, z: cz - Math.sin(-0.35) * (hw + 0.002), ry: -0.35 });
  add(THREE, g, new THREE.CylinderGeometry(0.012, 0.014, 0.045, 8), M.stone, 'cottage_chimney', { x: cx - 0.04, y: TOP + wh + 0.042, z: cz - 0.03 });
  // drying line with cloth
  const lx0 = -0.20, lx1 = 0.02, ly = TOP + 0.105;
  [lx0, lx1].forEach((x, i) =>
    add(THREE, g, new THREE.CylinderGeometry(0.005, 0.006, 0.115, 6), M.bark, 'line_post_' + i, { x, y: TOP + 0.057, z: lineZ }));
  add(THREE, g, new THREE.CylinderGeometry(0.002, 0.002, lx1 - lx0, 5), M.rope, 'drying_line', { x: (lx0 + lx1) / 2, y: ly, z: lineZ, rz: Math.PI / 2 });
  [M.brass, M.wool, M.shirtHerder, M.shirt].forEach((mtl, i) => {
    const geo = new THREE.BoxGeometry(0.044, 0.044, 0.004);
    geo.translate(0, -0.022, 0);
    add(THREE, g, geo, mtl, 'cloth_' + i, { x: lx0 + 0.026 + i * 0.056, y: ly - 0.002, z: lineZ });
  });
  [[0.02, 0.31, 0.034, 0], [0.07, 0.27, 0.026, 1]].forEach(([bx, bz, r, i]) =>
    add(THREE, g, new THREE.SphereGeometry(r, 12, 9), M.wool, 'wool_sack_' + i, { x: bx, y: TOP + r * 0.85, z: bz, sx: 1.0, sy: 0.85, sz: 1.0, ry: i }));
  addToken(THREE, g, M, 9, 4, false, 0.26, 0.28, TOP);
}

function barbarian_sea(THREE, g, M) {
  hexBase(THREE, g, M, M.deeperWater, M.deepWater);
  const bx = -0.06, bz = -0.12, ry = 0.55;
  add(THREE, g, new THREE.SphereGeometry(0.075, 18, 12), M.hullDark, 'boat_hull', { x: bx, y: TOP + 0.013, z: bz, sx: 2.7, sy: 0.58, sz: 0.90, ry });
  add(THREE, g, new THREE.SphereGeometry(0.075, 16, 10), M.wood, 'boat_deck', { x: bx, y: TOP + 0.020, z: bz, sx: 2.42, sy: 0.50, sz: 0.70, ry });
  // raised prow and stern
  add(THREE, g, new THREE.ConeGeometry(0.020, 0.088, 6), M.hullDark, 'boat_prow',
    { x: bx + Math.cos(ry) * 0.192, y: TOP + 0.055, z: bz - Math.sin(ry) * 0.192, rz: -0.45 * Math.cos(ry), rx: 0.45 * Math.sin(ry) });
  add(THREE, g, new THREE.SphereGeometry(0.016, 8, 6), M.ironDark, 'boat_prow_head',
    { x: bx + Math.cos(ry) * 0.214, y: TOP + 0.095, z: bz - Math.sin(ry) * 0.214 });
  add(THREE, g, new THREE.ConeGeometry(0.017, 0.066, 6), M.hullDark, 'boat_stern',
    { x: bx - Math.cos(ry) * 0.182, y: TOP + 0.047, z: bz + Math.sin(ry) * 0.182, rz: 0.42 * Math.cos(ry), rx: -0.42 * Math.sin(ry) });
  add(THREE, g, new THREE.CylinderGeometry(0.005, 0.005, 0.215, 8), M.bark, 'boat_mast', { x: bx, y: TOP + 0.128, z: bz });
  add(THREE, g, new THREE.BoxGeometry(0.138, 0.104, 0.004), M.sailDark, 'boat_sail', { x: bx, y: TOP + 0.152, z: bz, ry });
  add(THREE, g, new THREE.BoxGeometry(0.138, 0.018, 0.005), M.hullDark, 'boat_sail_band', { x: bx, y: TOP + 0.152, z: bz, ry });
  add(THREE, g, new THREE.CylinderGeometry(0.0025, 0.0025, 0.148, 5), M.bark, 'boat_yard', { x: bx, y: TOP + 0.206, z: bz, rz: Math.PI / 2, ry });
  // shields along the gunwale
  for (let i = 0; i < 4; i++) {
    const d = -0.090 + i * 0.060;
    add(THREE, g, new THREE.CylinderGeometry(0.015, 0.015, 0.004, 10), i % 2 ? M.sailDark : M.ironDark, 'boat_shield_' + i,
      { x: bx + Math.cos(ry) * d - Math.sin(ry) * 0.058, y: TOP + 0.034, z: bz - Math.sin(ry) * d - Math.cos(ry) * 0.058, rx: Math.PI / 2, ry });
  }
  // oars out on the far side
  for (let i = 0; i < 3; i++) {
    const d = -0.062 + i * 0.062;
    add(THREE, g, new THREE.CylinderGeometry(0.0025, 0.0035, 0.095, 5), M.bark, 'boat_oar_' + i,
      { x: bx + Math.cos(ry) * d + Math.sin(ry) * 0.082, y: TOP + 0.022, z: bz - Math.sin(ry) * d + Math.cos(ry) * 0.082, rz: Math.PI / 2, ry: ry + Math.PI / 2 + 0.25 });
  }
}

// ================= Batch 4 — Sites & Wonders =================

function tradepost(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capPasture);
  add(THREE, g, new THREE.CylinderGeometry(0.27, 0.29, 0.010, 12), M.stone, 'plaza', { y: TOP + 0.005 });
  grassField(THREE, g, M, { r: 0.39, n: 8, span: 0.100, h: 0.030, mats: [M.meadow, M.grassTip], clear: [[0, 0, 0.30]] });
  // market stall
  const sx = 0.0, sz = -0.04, ry = 0.30, hw = 0.105, hd = 0.075;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([px, pz], i) =>
    add(THREE, g, new THREE.CylinderGeometry(0.006, 0.006, 0.115, 6), M.wood, 'stall_post_' + i,
      { x: sx + Math.cos(ry) * px * hw - Math.sin(ry) * pz * hd, y: TOP + 0.068, z: sz - Math.sin(ry) * px * hw - Math.cos(ry) * pz * hd }));
  add(THREE, g, new THREE.BoxGeometry(hw * 2 + 0.02, 0.006, hd * 2 + 0.02), M.canvas, 'stall_awning', { x: sx, y: TOP + 0.128, z: sz, ry, rx: 0.10 });
  for (let i = 0; i < 3; i++)
    add(THREE, g, new THREE.BoxGeometry(0.040, 0.005, hd * 2 + 0.02), M.sailDark, 'stall_stripe_' + i,
      { x: sx + Math.cos(ry) * (-0.07 + i * 0.07), y: TOP + 0.131, z: sz - Math.sin(ry) * (-0.07 + i * 0.07), ry, rx: 0.10 });
  add(THREE, g, new THREE.BoxGeometry(hw * 2, 0.010, 0.040), M.woodLight, 'stall_counter',
    { x: sx + Math.sin(ry) * hd, y: TOP + 0.052, z: sz + Math.cos(ry) * hd, ry });
  [[-1], [1]].forEach(([side], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.012, 0.045, 0.030), M.wood, 'stall_leg_' + i,
      { x: sx + Math.cos(ry) * side * (hw - 0.02) + Math.sin(ry) * hd, y: TOP + 0.026, z: sz - Math.sin(ry) * side * (hw - 0.02) + Math.cos(ry) * hd, ry }));
  // goods
  add(THREE, g, new THREE.BoxGeometry(0.052, 0.052, 0.052), M.woodLight, 'crate_0', { x: -0.20, y: TOP + 0.036, z: 0.20, ry: 0.4 });
  add(THREE, g, new THREE.BoxGeometry(0.040, 0.040, 0.040), M.wood, 'crate_1', { x: -0.14, y: TOP + 0.030, z: 0.27, ry: -0.3 });
  add(THREE, g, new THREE.CylinderGeometry(0.026, 0.022, 0.052, 12), M.wood, 'barrel_0', { x: 0.20, y: TOP + 0.036, z: 0.22 });
  add(THREE, g, new THREE.CylinderGeometry(0.022, 0.019, 0.046, 12), M.woodLight, 'barrel_1', { x: 0.26, y: TOP + 0.033, z: 0.15 });
  add(THREE, g, new THREE.SphereGeometry(0.022, 10, 8), M.rope, 'sack_0', { x: 0.05, y: TOP + 0.028, z: 0.28, sx: 1.0, sy: 1.25, sz: 1.0 });
  add(THREE, g, new THREE.BoxGeometry(0.046, 0.046, 0.046), M.woodLight, 'crate_2', { x: -0.19, y: TOP + 0.088, z: 0.205, ry: 0.15 });
  add(THREE, g, new THREE.BoxGeometry(0.100, 0.004, 0.072), M.sailDark, 'goods_mat', { x: 0.16, y: TOP + 0.013, z: -0.26, ry: 0.35 });
  [[0.13, -0.28, 0.012], [0.18, -0.24, 0.010], [0.20, -0.29, 0.009]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.SphereGeometry(r, 8, 6), i % 2 ? M.brass : M.wool, 'wares_' + i, { x, y: TOP + 0.015 + r, z }));
  // the trader, behind his counter
  const tgx = -0.02, tgz = 0.165, tgry = 3.05;
  const tf = figure(THREE, g, M, tgx, tgz, tgry, M.shirt, 'trader');
  add(THREE, g, new THREE.CylinderGeometry(0.007, 0.007, 0.042, 8), M.shirt, 'trader_arm',
    { x: tgx + Math.cos(tgry) * 0.024, y: tf.armY, z: tgz - Math.sin(tgry) * 0.024, rz: -0.9 });
  // pennanted masts
  [[-0.28, -0.16, 0.9], [0.30, -0.12, -0.6]].forEach(([mx, mz, mry], i) => {
    add(THREE, g, new THREE.CylinderGeometry(0.005, 0.006, 0.20, 6), M.bark, 'mast_' + i, { x: mx, y: TOP + 0.10, z: mz });
    pennant(THREE, g, M, i * 2, mx, TOP + 0.175, mz, mry, M.brass);
    pennant(THREE, g, M, i * 2 + 1, mx, TOP + 0.140, mz, mry + 0.5, M.canvas, 0.042);
  });
}

function ruins(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capMountain);
  add(THREE, g, new THREE.CylinderGeometry(0.30, 0.32, 0.008, 12), M.stoneDark, 'ruin_floor', { y: TOP + 0.004 });
  // standing and toppled columns
  [[-0.22, -0.16, 0.155], [0.20, -0.20, 0.105], [-0.24, 0.16, 0.075], [0.26, 0.14, 0.130]].forEach(([x, z, h], i) => {
    add(THREE, g, new THREE.CylinderGeometry(0.030, 0.034, 0.012, 10), M.stone, 'column_base_' + i, { x, y: TOP + 0.012, z });
    add(THREE, g, new THREE.CylinderGeometry(0.024, 0.027, h, 10), M.stone, 'column_' + i, { x, y: TOP + 0.018 + h / 2, z, rz: (i % 2 ? 0.05 : -0.04) });
    if (i % 2) add(THREE, g, new THREE.BoxGeometry(0.062, 0.014, 0.062), M.stoneDark, 'column_cap_' + i, { x, y: TOP + 0.026 + h, z, ry: 0.2 });
  });
  add(THREE, g, new THREE.CylinderGeometry(0.024, 0.024, 0.19, 10), M.stone, 'column_fallen', { x: 0.02, y: TOP + 0.028, z: 0.30, rz: Math.PI / 2, ry: 0.5, rx: 0.05 });
  // half-buried arch
  const ax = -0.02, az = -0.02;
  [[-1], [1]].forEach(([side], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.030, 0.10, 0.030), M.stone, 'arch_post_' + i, { x: ax + side * 0.075, y: TOP + 0.050, z: az, ry: 0.15 }));
  const arch = add(THREE, g, new THREE.TorusGeometry(0.075, 0.016, 6, 18, Math.PI), M.stone, 'arch_span', { x: ax, y: TOP + 0.098, z: az, ry: 0.15 });
  arch.rotation.z = 0.10;
  // scattered blocks, part sunk
  [[-0.34, 0.06, 0.7], [0.34, -0.06, -0.4], [0.14, 0.24, 1.1], [-0.14, 0.30, 0.3], [0.30, 0.28, -0.8],
   [-0.32, -0.26, 0.5], [0.22, -0.32, -1.0], [-0.06, 0.36, 0.2], [0.36, 0.10, 0.9]].forEach(([x, z, ry], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.048, 0.030, 0.040), i % 2 ? M.stone : M.stoneDark, 'block_' + i, { x, y: TOP + 0.012, z, ry, rz: (i % 2 ? 0.10 : -0.06) }));
  // a broken step course leading nowhere
  [0, 1, 2].forEach(i =>
    add(THREE, g, new THREE.BoxGeometry(0.135 - i * 0.022, 0.014, 0.042), M.stone, 'step_' + i,
      { x: 0.04, y: TOP + 0.015 + i * 0.014, z: -0.30 + i * 0.030, ry: 0.12 }));
  add(THREE, g, new THREE.BoxGeometry(0.062, 0.016, 0.062), M.stoneDark, 'fallen_capital', { x: -0.30, y: TOP + 0.016, z: -0.08, ry: 0.4, rz: 0.12 });
  [[-0.19, 0.26, 0.013], [0.09, 0.13, 0.011], [-0.10, -0.20, 0.012], [0.24, -0.13, 0.010]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.stoneDark, 'rubble_' + i, { x, y: TOP + r * 0.7, z, ry: i * 1.4 }));
  // moss patches
  [[-0.17, -0.02, 0.062], [0.17, 0.05, 0.050], [-0.06, 0.21, 0.044]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.SphereGeometry(r, 10, 8), M.foliage, 'moss_' + i, { x, y: TOP + 0.008, z, sx: 1.25, sy: 0.09, sz: 1.0 }));
  // the only motion: moss-grass in the cracks
  grassField(THREE, g, M, {
    r: 0.36, n: 7, span: 0.100, h: 0.028, mats: [M.moss, M.meadow],
    clear: [[ax, az, 0.11], [-0.22, -0.16, 0.06], [0.20, -0.20, 0.06], [0.26, 0.14, 0.06], [-0.24, 0.16, 0.06]],
  });
}

// stage 1 foundation → 2 half-built + scaffold → 3 topped out with brass
function monument(THREE, g, M, stage = 3) {
  hexBase(THREE, g, M, M.earth, M.capMountain);
  add(THREE, g, new THREE.CylinderGeometry(0.30, 0.32, 0.012, 12), M.stone, 'plaza', { y: TOP + 0.006 });
  const ring = add(THREE, g, new THREE.TorusGeometry(0.235, 0.011, 6, 26), M.brass, 'plaza_ring', { y: TOP + 0.014 });
  ring.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(THREE, g, new THREE.ConeGeometry(0.016, 0.032, 4), M.brassHi, 'plaza_marker_' + i,
      { x: Math.cos(a) * 0.275, y: TOP + 0.028, z: Math.sin(a) * 0.275, ry: a });
  }
  add(THREE, g, new THREE.CylinderGeometry(0.130, 0.150, 0.026, 8), M.stoneDark, 'plinth', { y: TOP + 0.025 });
  const pband = add(THREE, g, new THREE.TorusGeometry(0.133, 0.006, 5, 20), M.brass, 'plinth_band', { y: TOP + 0.036 });
  pband.rotation.x = Math.PI / 2;
  const baseY = TOP + 0.038;
  // dressed blocks waiting to be set
  [[-0.235, 0.14, 0.6], [-0.19, 0.22, -0.2], [0.235, -0.12, 1.0], [0.20, 0.24, 0.3]].forEach(([x, z, ry], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.055, 0.032, 0.045), i % 2 ? M.stone : M.stoneDark, 'block_' + i, { x, y: TOP + 0.022, z, ry }));
  const h = stage === 1 ? 0.055 : stage === 2 ? 0.165 : 0.285;
  add(THREE, g, new THREE.CylinderGeometry(stage === 3 ? 0.046 : 0.062, 0.082, h, 4), M.stone, 'obelisk', { y: baseY + h / 2, ry: Math.PI / 4 });
  if (stage === 3) {
    add(THREE, g, new THREE.ConeGeometry(0.064, 0.070, 4), M.brassHi, 'obelisk_cap', { y: baseY + h + 0.035, ry: Math.PI / 4 });
    add(THREE, g, new THREE.BoxGeometry(0.140, 0.009, 0.009), M.brass, 'obelisk_band', { y: baseY + h * 0.62, ry: Math.PI / 4 });
  }
  if (stage >= 2) {
    const full = stage === 2;
    const sh = full ? 0.20 : 0.245;
    (full ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, -1], [-1, 1]]).forEach(([sx, sz], i) =>
      add(THREE, g, new THREE.CylinderGeometry(0.005, 0.005, sh, 6), M.bark, 'scaffold_post_' + i,
        { x: sx * 0.122, y: baseY + sh / 2, z: sz * 0.122 }));
    (full ? [0.06, 0.135, 0.19] : [0.085, 0.185]).forEach((ry2, r) => {
      (full ? [[0, 1], [0, -1], [1, 0], [-1, 0]] : [[-1, 0]]).forEach(([dx, dz], k) =>
        add(THREE, g, new THREE.BoxGeometry(dx ? 0.006 : 0.250, 0.005, dx ? 0.250 : 0.006), M.bark, 'scaffold_rail_' + r + '_' + k,
          { x: dx * 0.122, y: baseY + ry2, z: dz * 0.122 }));
    });
    if (full) {
      add(THREE, g, new THREE.BoxGeometry(0.258, 0.006, 0.055), M.woodLight, 'scaffold_deck', { x: 0, y: baseY + 0.140, z: 0.122 });
      add(THREE, g, new THREE.BoxGeometry(0.010, 0.006, 0.115), M.bark, 'scaffold_ladder', { x: -0.122, y: baseY + 0.075, z: 0.02, rz: 0.5 });
    }
    pennant(THREE, g, M, 0, -0.122, baseY + sh - 0.012, -0.122, 2.3, M.brass);
  }
  [[-0.30, -0.16, 0.020], [0.30, 0.06, 0.016], [0.10, -0.33, 0.014], [-0.16, 0.33, 0.012]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.stoneDark, 'rubble_' + i, { x, y: TOP + 0.020, z, ry: i * 1.6 }));
  // a stone sled and the mason hauling for it
  add(THREE, g, new THREE.BoxGeometry(0.105, 0.008, 0.070), M.bark, 'sled_bed', { x: -0.05, y: TOP + 0.018, z: -0.29, ry: 0.25 });
  [[-1], [1]].forEach(([side], i) =>
    add(THREE, g, new THREE.BoxGeometry(0.115, 0.010, 0.010), M.bark, 'sled_runner_' + i,
      { x: -0.05 - Math.sin(0.25) * side * 0.030, y: TOP + 0.008, z: -0.29 - Math.cos(0.25) * side * 0.030, ry: 0.25 }));
  add(THREE, g, new THREE.BoxGeometry(0.058, 0.034, 0.048), M.stone, 'sled_block', { x: -0.05, y: TOP + 0.039, z: -0.29, ry: 0.25 });
  const mgx = 0.19, mgz = -0.20, mgry = 2.2;
  const mf = figure(THREE, g, M, mgx, mgz, mgry, M.shirt, 'mason');
  add(THREE, g, new THREE.CylinderGeometry(0.007, 0.007, 0.044, 8), M.shirt, 'mason_arm',
    { x: mgx + Math.cos(mgry) * 0.024, y: mf.armY, z: mgz - Math.sin(mgry) * 0.024, rz: -0.8 });
  add(THREE, g, new THREE.BoxGeometry(0.030, 0.008, 0.010), M.steel, 'mason_mallet',
    { x: mgx + Math.cos(mgry) * 0.050, y: mf.armY + 0.014, z: mgz - Math.sin(mgry) * 0.050, rz: 0.5 });
}

// ---- registry ----
export const EXPANSION_BUILDERS = {
  gold, searoute, fog, isle,
  volcano, oasis, jungle, swamp,
  forest_mill, mountains_mine, pasture_weavery, barbarian_sea,
  tradepost, ruins,
  monument: (THREE, g, M) => monument(THREE, g, M, 3),
  monument_1: (THREE, g, M) => monument(THREE, g, M, 1),
  monument_2: (THREE, g, M) => monument(THREE, g, M, 2),
  monument_3: (THREE, g, M) => monument(THREE, g, M, 3),
};

export const EXPANSION_KINDS = Object.keys(EXPANSION_BUILDERS);

export const NEW_ANIM_PREFIXES = [
  'gold_flake_*', 'fog_puff_*', 'volcano_smoke_*', 'volcano_glow',
  'oasis_glint', 'swamp_bubble_*', 'mill_wheel*', 'mine_wheel*', 'cloth_*', 'banner_*',
];

export function buildExpansionTile(THREE, kind, opts = {}) {
  SKIP_TOKEN = !!opts.noToken;
  const g = new THREE.Group();
  g.name = 'catan_' + kind + '_tile';
  const M = makeMats(THREE);
  EXPANSION_BUILDERS[kind](THREE, g, M);
  return g;
}

// ---- living detail for the new prefixes ----
// Mirrors hex-board.js _registerLife/_frame: register once per tile, step once per
// frame with the board's own clock t = ((now - t0) / 1000) * 2.6.
// In hex-board.js:
//   _addTile → this._registerLife(tile); registerExpansionLife(THREE, tile, this._life);
//   _frame   → stepExpansionLife(this._life, t);

const bucket = (life, k) => (life[k] || (life[k] = []));
const hash = (o) => (o.position.x * 7.9 + o.position.z * 5.3 + o.name.length * 0.7);

export function registerExpansionLife(THREE, tile, life) {
  for (const o of tile.children) {
    const n = o.name;
    if (/^gold_flake_/.test(n)) bucket(life, 'flakes').push({ mesh: o, ry: o.rotation.y, phase: hash(o) });
    else if (/^fog_puff_/.test(n)) bucket(life, 'puffs').push({ mesh: o, x: o.position.x, z: o.position.z, o: o.material.opacity, phase: hash(o) });
    else if (/^volcano_smoke_/.test(n)) bucket(life, 'smoke').push({ mesh: o, y: o.position.y, s: o.scale.x, phase: (bucket(life, 'smoke').length % 6) / 6 });
    else if (n === 'volcano_glow') bucket(life, 'glows').push({ mesh: o, ei: o.material.emissiveIntensity, phase: hash(o) });
    else if (n === 'oasis_glint') bucket(life, 'glints').push({ mesh: o, o: o.material.opacity, phase: hash(o) });
    else if (/^swamp_bubble_/.test(n)) bucket(life, 'bubbles').push({ mesh: o, y: o.position.y, s: o.scale.x, o: o.material.opacity, phase: hash(o) % 1 });
    else if (/^mill_wheel/.test(n)) bucket(life, 'wheels').push({ mesh: o, rz: o.rotation.z, sp: 0.42 });
    else if (/^mine_wheel/.test(n)) bucket(life, 'wheels').push({ mesh: o, rz: o.rotation.z, sp: 0.62 });
    else if (/^cloth_/.test(n)) bucket(life, 'cloths').push({ mesh: o, rx: o.rotation.x, rz: o.rotation.z, phase: hash(o) });
    else if (/^banner_/.test(n)) bucket(life, 'banners').push({ mesh: o, ry: o.rotation.y, rz: o.rotation.z, phase: hash(o) });
  }
}

export function stepExpansionLife(life, t) {
  for (const f of life.flakes || []) {
    f.mesh.rotation.y = f.ry + t * 0.30;
    f.mesh.scale.setScalar(1 + Math.sin(t * 1.7 + f.phase) * 0.14);
  }
  for (const p of life.puffs || []) {
    const a = t * 0.085 + p.phase;
    p.mesh.position.x = p.x + Math.cos(a) * 0.016;
    p.mesh.position.z = p.z + Math.sin(a) * 0.012;
    p.mesh.material.opacity = p.o * (0.74 + 0.26 * Math.sin(t * 0.45 + p.phase));
  }
  for (const s of life.smoke || []) {
    const u = ((t * 0.05 + s.phase) % 1 + 1) % 1;
    s.mesh.position.y = s.y + u * 0.26;
    s.mesh.scale.setScalar(s.s * (0.5 + u * 1.15));
    s.mesh.material.opacity = 0.42 * Math.sin(Math.PI * u);
  }
  for (const gl of life.glows || []) {
    const s = Math.sin(t * 0.85 + gl.phase);
    gl.mesh.material.emissiveIntensity = gl.ei * (0.78 + 0.34 * s);
    gl.mesh.scale.setScalar(1 + s * 0.05);
  }
  for (const gt of life.glints || []) {
    const s = 0.5 + 0.5 * Math.sin(t * 0.75 + gt.phase);
    gt.mesh.material.opacity = gt.o * (0.55 + 0.75 * s);
    gt.mesh.scale.set(1 + s * 0.06, 1 + s * 0.06, 1);
  }
  for (const b of life.bubbles || []) {
    const u = ((t * 0.12 + b.phase) % 1 + 1) % 1;
    b.mesh.position.y = b.y + u * 0.042;
    b.mesh.scale.setScalar(b.s * (0.55 + u * 0.6));
    b.mesh.material.opacity = 0.5 * (1 - u) * (u < 0.1 ? u / 0.1 : 1);
  }
  for (const w of life.wheels || []) w.mesh.rotation.z = w.rz + t * w.sp;
  for (const c of life.cloths || []) {
    c.mesh.rotation.x = c.rx + Math.sin(t * 1.0 + c.phase) * 0.20;
    c.mesh.rotation.z = c.rz + Math.sin(t * 0.68 + c.phase) * 0.06;
  }
  for (const b of life.banners || []) {
    b.mesh.rotation.y = b.ry + Math.sin(t * 1.5 + b.phase) * 0.20;
    b.mesh.rotation.z = b.rz + Math.sin(t * 1.9 + b.phase) * 0.07;
  }
}
