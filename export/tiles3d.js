// Catan-style terrain hex tiles — built from three.js primitives.
// buildTile(THREE, kind) → THREE.Group of named meshes/materials.
// Hex: circumradius 0.5 m, y-up, base resting at y=0.

const R = 0.5;          // hex circumradius
const BASE_H = 0.07;    // earth rim height
const CAP_H = 0.02;     // terrain cap
const TOP = BASE_H + CAP_H; // y of terrain surface

function mat(THREE, name, color, rough = 0.9, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: opts.metal ?? 0, flatShading: !!opts.flat });
  m.name = name;
  return m;
}

function makeMats(THREE) {
  return {
    earth: mat(THREE, 'earth', 0x8a6b45, 0.95, { flat: true }),
    deepWater: mat(THREE, 'deep_water', 0x1d4f70, 0.5, { flat: true }),
    capForest: mat(THREE, 'forest_floor', 0x4e7c3a, 0.95, { flat: true }),
    capPasture: mat(THREE, 'pasture_grass', 0x6fae52, 0.95, { flat: true }),
    capField: mat(THREE, 'field_soil', 0xb9924f, 0.95, { flat: true }),
    capHills: mat(THREE, 'clay_ground', 0xa9683f, 0.95, { flat: true }),
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
    wheat: mat(THREE, 'wheat', 0xd9a844, 0.9, { flat: true }),
    wheatDark: mat(THREE, 'wheat_dark', 0xc4923a, 0.9, { flat: true }),
    hay: mat(THREE, 'hay', 0xd8ab4e, 0.95),
    clay: mat(THREE, 'clay', 0x9c5a35, 0.95),
    clayDark: mat(THREE, 'clay_dark', 0x8a4a28, 0.95, { flat: true }),
    clayDeep: mat(THREE, 'clay_deep', 0x6b3719, 0.95, { flat: true }),
    pitShadow: mat(THREE, 'pit_shadow', 0x40200f, 1.0, { flat: true }),
    grassTip: mat(THREE, 'grass_tip', 0x7cbf5c, 0.95, { flat: true }),
    brick: mat(THREE, 'brick', 0x8f3b2a, 0.85, { flat: true }),
    rock: mat(THREE, 'rock', 0x84868d, 0.95, { flat: true }),
    snow: mat(THREE, 'snow', 0xeef1f4, 0.8, { flat: true }),
    sandDune: mat(THREE, 'sand_dune', 0xd2b57a, 0.95),
    cactus: mat(THREE, 'cactus', 0x50803f, 0.85),
    wood: mat(THREE, 'dock_wood', 0x77573a, 0.9, { flat: true }),
    woodLight: mat(THREE, 'crate_wood', 0x8d6a45, 0.9, { flat: true }),
    canvas: mat(THREE, 'sail_canvas', 0xe8e2d2, 0.9),
    rope: mat(THREE, 'rope', 0xcbb289, 1.0),
    skin: mat(THREE, 'skin', 0xd8a577, 0.9),
    shirt: mat(THREE, 'shirt_flannel', 0xa03a2c, 0.95),
    shirtHerder: mat(THREE, 'shirt_herder', 0x4a6e8a, 0.95),
    pants: mat(THREE, 'pants', 0x3f4453, 0.95),
    steel: mat(THREE, 'axe_steel', 0xb8bcc2, 0.4, { metal: 0.6 }),
    camel: mat(THREE, 'camel_hide', 0xc49a58, 0.95),
    eagle: mat(THREE, 'eagle_feather', 0x4a3826, 0.9),
    eagleWhite: mat(THREE, 'eagle_head', 0xece7da, 0.9),
    beak: mat(THREE, 'beak', 0xd9a844, 0.7),
    barnRed: mat(THREE, 'barn_wall', 0x8f3b2a, 0.9, { flat: true }),
    barnRoof: mat(THREE, 'barn_roof', 0x5c5f6a, 0.9, { flat: true }),
    barnTrim: mat(THREE, 'barn_trim', 0xece7da, 0.9),
    token: mat(THREE, 'token', 0xe9dbb5, 0.85, { flat: true }),
    digitDark: mat(THREE, 'digit', 0x46342a, 0.8, { flat: true }),
    digitRed: mat(THREE, 'digit_red', 0xb03a2e, 0.8, { flat: true }),
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

// triangular prism: length along local x, ridge apex up, flat base down
function prismGeo(THREE, rd, len) {
  const geo = new THREE.CylinderGeometry(rd, rd, len, 3, 1);
  geo.rotateY(Math.PI / 2);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

function hexBase(THREE, g, M, rimMat, capMat) {  add(THREE, g, new THREE.CylinderGeometry(R, R, BASE_H, 6), rimMat, 'hex_rim', { y: BASE_H / 2 });
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

// ---- terrain builders ----
function forest(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capForest);
  const trees = [
    [-0.30, -0.18, 1.15], [-0.05, -0.30, 1.0], [0.22, -0.24, 1.25], [0.36, -0.02, 0.9],
    [-0.34, 0.06, 0.95], [-0.16, -0.06, 1.1], [0.12, -0.05, 0.85], [-0.22, 0.24, 1.05], [0.28, 0.20, 1.0],
  ];
  trees.forEach(([x, z, s], i) => {
    const th = 0.09 * s, y0 = TOP;
    add(THREE, g, new THREE.CylinderGeometry(0.013 * s, 0.017 * s, th, 8), M.bark, 'trunk_' + i, { x, y: y0 + th / 2, z });
    add(THREE, g, new THREE.ConeGeometry(0.075 * s, 0.15 * s, 8), M.foliage, 'canopy_low_' + i, { x, y: y0 + th + 0.06 * s, z, ry: i });
    add(THREE, g, new THREE.ConeGeometry(0.055 * s, 0.12 * s, 8), M.foliageLight, 'canopy_top_' + i, { x, y: y0 + th + 0.145 * s, z, ry: i + 0.4 });
  });
  [[0.05, 0.14], [-0.36, -0.30]].forEach(([x, z], i) =>
    add(THREE, g, new THREE.ConeGeometry(0.014, 0.035, 5), M.foliageLight, 'sapling_' + i, { x, y: TOP + 0.017, z }));
  // lumberjack with axe by a stump
  const lx = 0.02, lz = 0.13, lry = -0.6;
  const { armY } = figure(THREE, g, M, lx, lz, lry, M.shirt, 'lumberjack');
  add(THREE, g, new THREE.CylinderGeometry(0.007, 0.007, 0.05, 8), M.shirt, 'lumberjack_arm',
    { x: lx + Math.cos(lry) * 0.026, y: armY, z: lz - Math.sin(lry) * 0.026, rz: 0.9 });
  const ax = lx + Math.cos(lry) * 0.048, az = lz - Math.sin(lry) * 0.048;
  add(THREE, g, new THREE.CylinderGeometry(0.004, 0.004, 0.085, 8), M.bark, 'axe_handle', { x: ax, y: armY + 0.01, z: az, rz: 0.35 });
  add(THREE, g, new THREE.BoxGeometry(0.030, 0.018, 0.006), M.steel, 'axe_head', { x: ax + 0.015, y: armY + 0.048, z: az, rz: 0.35 });
  add(THREE, g, new THREE.CylinderGeometry(0.026, 0.030, 0.028, 10), M.bark, 'stump', { x: lx + 0.09, y: TOP + 0.014, z: lz + 0.05 });
  add(THREE, g, new THREE.CylinderGeometry(0.024, 0.024, 0.004, 10), M.woodLight, 'stump_top', { x: lx + 0.09, y: TOP + 0.030, z: lz + 0.05 });
  addToken(THREE, g, M, 5, 4, false, 0, 0.31, TOP);
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

function pasture(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capPasture);
  const SHEEP = [[-0.08, -0.14, 0.5], [0.20, 0.05, 2.4], [-0.28, 0.02, -1.2]];
  const clear = [[-0.08, -0.14, 0.11], [0.20, 0.05, 0.11], [-0.28, 0.02, 0.11], [0.10, -0.28, 0.10], [0.02, 0.31, 0.11]];
  // short grass on a jittered grid — named grass_* so the board can ripple it
  const rnd = (a, b) => { const h = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return h - Math.floor(h); };
  let n = 0;
  for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) {
    const j1 = rnd(row + 1, col + 1), j2 = rnd(col + 3, row + 7);
    const x = -0.372 + col * 0.093 + (j1 - 0.5) * 0.06;
    const z = -0.372 + row * 0.093 + (j2 - 0.5) * 0.06;
    if (Math.hypot(x, z) > 0.40) continue;
    if (clear.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    const s = 0.75 + j1 * 0.7;
    const h = 0.032 * s;
    // origin at the blade's base so it stays planted and only the tip leans;
    // the facing variety is baked into the geometry, leaving rotation.z free for wind
    const blade = new THREE.ConeGeometry(0.010, h, 5);
    blade.rotateY(j2 * 3);
    blade.translate(0, h / 2, 0);
    add(THREE, g, blade, n % 3 ? M.meadow : M.grassTip, 'grass_' + n, { x, y: TOP, z });
    n++;
  }
  SHEEP.forEach(([x, z, ry], i) => sheep(THREE, g, M, x, z, ry, i));
  // herder with staff watching the flock
  const hx = 0.10, hz = -0.28, hry = 2.2;
  const { armY } = figure(THREE, g, M, hx, hz, hry, M.shirtHerder, 'herder');
  const sx2 = hx + Math.cos(hry) * 0.03, sz2 = hz - Math.sin(hry) * 0.03;
  add(THREE, g, new THREE.CylinderGeometry(0.0035, 0.0035, 0.13, 8), M.bark, 'staff', { x: sx2, y: TOP + 0.065, z: sz2 });
  add(THREE, g, new THREE.TorusGeometry(0.011, 0.0035, 8, 14, Math.PI * 1.4), M.bark, 'staff_crook', { x: sx2, y: TOP + 0.135, z: sz2, rz: 1.9 });
  add(THREE, g, new THREE.CylinderGeometry(0.007, 0.007, 0.045, 8), M.shirtHerder, 'herder_arm',
    { x: hx + Math.cos(hry) * 0.022, y: armY, z: hz - Math.sin(hry) * 0.022, rz: -0.7 });
  addToken(THREE, g, M, 9, 4, false, 0.02, 0.31, TOP);
}

function fields(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capField);
  for (let i = 0; i < 9; i++) {
    const z = -0.36 + i * 0.09;
    const half = Math.max(0.1, Math.sqrt(Math.max(0, 0.44 * 0.44 - z * z)) - 0.03);
    const m = i % 2 ? M.wheatDark : M.wheat;
    if (z > 0.20 && z < 0.42) { // leave room for the token
      const inner = 0.14, len = half - inner;
      if (len > 0.03) {
        add(THREE, g, new THREE.BoxGeometry(len, 0.022, 0.055), m, 'furrow_' + i + '_l', { x: -(inner + len / 2), y: TOP + 0.011, z });
        add(THREE, g, new THREE.BoxGeometry(len, 0.022, 0.055), m, 'furrow_' + i + '_r', { x: inner + len / 2, y: TOP + 0.011, z });
      }
    } else if (z > -0.33 && z < -0.05) { // leave room for the barn
      const len = half + 0.04;
      add(THREE, g, new THREE.BoxGeometry(len, 0.022, 0.055), m, 'furrow_' + i, { x: (0.04 - half) / 2, y: TOP + 0.011, z });
    } else {
      add(THREE, g, new THREE.BoxGeometry(half * 2, 0.022, 0.055), m, 'furrow_' + i, { x: 0, y: TOP + 0.011, z });
    }
  }
  add(THREE, g, new THREE.CylinderGeometry(0.05, 0.05, 0.09, 20), M.hay, 'hay_bale', { x: -0.28, y: TOP + 0.05 + 0.022, z: 0.28, rz: Math.PI / 2, ry: 0.5 });
  // red barn with gabled grey roof on a dirt yard
  const bX = 0.22, bZ = -0.19, bRy = -0.5, bw2 = 0.12, bd2 = 0.095, wh = 0.07;
  add(THREE, g, new THREE.CylinderGeometry(0.14, 0.15, 0.012, 6), M.capField, 'barn_yard', { x: bX, y: TOP + 0.006, z: bZ, ry: bRy });
  add(THREE, g, new THREE.BoxGeometry(bw2, wh, bd2), M.barnRed, 'barn_walls', { x: bX, y: TOP + 0.012 + wh / 2, z: bZ, ry: bRy });
  const roof = add(THREE, g, prismGeo(THREE, bd2 * 0.60, bw2 + 0.008), M.barnRoof, 'barn_roof',
    { x: bX, y: TOP + 0.012 + wh + 0.019, z: bZ, ry: bRy });
  roof.scale.set(1, 0.75, 0.95);
  add(THREE, g, new THREE.BoxGeometry(0.004, 0.042, 0.038), M.barnTrim, 'barn_door',
    { x: bX + Math.cos(bRy) * (bw2 / 2 + 0.001), y: TOP + 0.012 + 0.021, z: bZ - Math.sin(bRy) * (bw2 / 2 + 0.001), ry: bRy });
  addToken(THREE, g, M, 6, 5, true, 0, 0.31, TOP);
}

// An open clay pit: a raised lip with terraces darkening toward the floor.
function pit(THREE, g, M, x, z, r, i) {
  const lip = add(THREE, g, new THREE.TorusGeometry(r, 0.012, 8, 24), M.clay, 'pit_lip_' + i, { x, y: TOP + 0.004, z });
  lip.rotation.x = Math.PI / 2;
  lip.scale.set(1, 1, 0.5);
  add(THREE, g, new THREE.CylinderGeometry(r, r, 0.003, 26), M.clayDark, 'pit_wall_' + i, { x, y: TOP + 0.0015, z });
  add(THREE, g, new THREE.CylinderGeometry(r * 0.68, r * 0.68, 0.003, 24), M.clayDeep, 'pit_step_' + i, { x, y: TOP + 0.0025, z });
  add(THREE, g, new THREE.CylinderGeometry(r * 0.36, r * 0.36, 0.003, 20), M.pitShadow, 'pit_floor_' + i, { x, y: TOP + 0.0035, z });
}

function hills(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capHills);
  // dug-out clay pits rather than hills — this is a quarry
  [[-0.22, -0.14, 0.145], [0.17, -0.25, 0.105], [-0.08, 0.10, 0.105]].forEach(([x, z, r], i) =>
    pit(THREE, g, M, x, z, r, i));
  // plank ramp down into the big pit
  const ramp = add(THREE, g, new THREE.BoxGeometry(0.105, 0.006, 0.034), M.bark, 'pit_ramp', { x: -0.30, y: TOP + 0.010, z: -0.02, ry: 0.7 });
  ramp.rotation.z = 0.16;
  [[-0.03, -0.30, 0.022], [-0.40, -0.24, 0.018]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.clay, 'clay_lump_' + i, { x, y: TOP + r * 0.7, z, ry: i * 1.7 }));
  // brick stack: 3-2-1 pyramid
  const bx = 0.28, bz = 0.20, bw = 0.075, bh = 0.032, bd = 0.038;
  const rows = [[3, 0], [2, bh], [1, bh * 2]];
  rows.forEach(([n, dy], r) => {
    for (let i = 0; i < n; i++)
      add(THREE, g, new THREE.BoxGeometry(bw, bh, bd), M.brick, 'brick_' + r + '_' + i,
        { x: bx - ((n - 1) / 2) * 0.0 + 0, y: TOP + bh / 2 + dy + 0.001, z: bz + (i - (n - 1) / 2) * (bd + 0.004), ry: 0.15 });
  });
  addToken(THREE, g, M, 8, 5, true, -0.06, 0.31, TOP);
}

function peak(THREE, g, M, x, z, r, h, snowy, i) {
  add(THREE, g, new THREE.ConeGeometry(r, h, 6), M.rock, 'peak_' + i, { x, y: TOP + h / 2, z, ry: i * 0.7 });
  if (snowy) {
    const hs = h * 0.32, rs = r * (hs / h) * 1.1;
    add(THREE, g, new THREE.ConeGeometry(rs, hs, 6), M.snow, 'snowcap_' + i, { x, y: TOP + h - hs / 2 + 0.002, z, ry: i * 0.7 });
  }
}

function mountains(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capMountain);
  peak(THREE, g, M, -0.16, -0.08, 0.17, 0.30, true, 0);
  peak(THREE, g, M, 0.16, -0.16, 0.14, 0.23, true, 1);
  peak(THREE, g, M, 0.02, 0.08, 0.12, 0.16, false, 2);
  [[-0.35, 0.20, 0.030], [0.30, 0.10, 0.024], [-0.05, -0.34, 0.034], [0.36, -0.30, 0.02]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.rock, 'boulder_' + i, { x, y: TOP + r * 0.7, z, ry: i * 1.3 }));
  // eagle soaring above the peaks, wings banked
  const gx = 0.14, gy = TOP + 0.40, gz = 0.06, gry = 0.7;
  add(THREE, g, new THREE.SphereGeometry(0.016, 14, 10), M.eagle, 'eagle_body', { x: gx, y: gy, z: gz, sx: 2.0, sy: 0.75, sz: 0.8, ry: gry });
  add(THREE, g, new THREE.SphereGeometry(0.010, 12, 8), M.eagleWhite, 'eagle_head', { x: gx + Math.cos(gry) * 0.030, y: gy + 0.004, z: gz - Math.sin(gry) * 0.030 });
  add(THREE, g, new THREE.ConeGeometry(0.004, 0.010, 6), M.beak, 'eagle_beak', { x: gx + Math.cos(gry) * 0.042, y: gy + 0.004, z: gz - Math.sin(gry) * 0.042, rz: -Math.PI / 2 * Math.cos(gry), rx: -Math.PI / 2 * Math.sin(gry) });
  [[1, 0], [-1, 1]].forEach(([side, i]) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.003, 0.085), M.eagle);
    wing.name = 'eagle_wing_' + i;
    wing.position.set(gx - Math.sin(gry) * side * 0.048, gy + 0.012 * side * 0.5 + 0.006, gz - Math.cos(gry) * side * 0.048);
    wing.rotation.set(side * 0.35 * Math.cos(gry), gry, side * 0.35 * Math.sin(gry));
    g.add(wing);
  });
  add(THREE, g, new THREE.BoxGeometry(0.028, 0.003, 0.022), M.eagleWhite, 'eagle_tail', { x: gx - Math.cos(gry) * 0.034, y: gy, z: gz + Math.sin(gry) * 0.034, ry: gry });
  addToken(THREE, g, M, 3, 2, false, 0, 0.32, TOP);
}

function desert(THREE, g, M) {
  hexBase(THREE, g, M, M.earth, M.capDesert);
  [[-0.20, -0.12, 0.18], [0.22, -0.20, 0.14], [0.10, 0.18, 0.12], [-0.30, 0.18, 0.10]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.SphereGeometry(r, 24, 16), M.sandDune, 'dune_' + i, { x, y: TOP + 0.006, z, sx: 1.7, sy: 0.30, sz: 1.1 }));
  // cactus
  const cx = 0.05, cz = -0.05;
  add(THREE, g, new THREE.CylinderGeometry(0.020, 0.023, 0.14, 12), M.cactus, 'cactus_trunk', { x: cx, y: TOP + 0.07, z: cz });
  add(THREE, g, new THREE.SphereGeometry(0.020, 12, 10), M.cactus, 'cactus_top', { x: cx, y: TOP + 0.14, z: cz });
  [[1, 0.06], [-1, 0.09]].forEach(([side, ay], i) => {
    add(THREE, g, new THREE.CylinderGeometry(0.011, 0.011, 0.045, 10), M.cactus, 'cactus_arm_h_' + i, { x: cx + side * 0.032, y: TOP + ay, z: cz, rz: Math.PI / 2 });
    add(THREE, g, new THREE.CylinderGeometry(0.011, 0.011, 0.055, 10), M.cactus, 'cactus_arm_v_' + i, { x: cx + side * 0.052, y: TOP + ay + 0.026, z: cz });
    add(THREE, g, new THREE.SphereGeometry(0.011, 10, 8), M.cactus, 'cactus_arm_tip_' + i, { x: cx + side * 0.052, y: TOP + ay + 0.054, z: cz });
  });
  [[-0.36, -0.26, 0.022], [0.32, 0.06, 0.018], [-0.15, 0.14, 0.026]].forEach(([x, z, r], i) =>
    add(THREE, g, new THREE.IcosahedronGeometry(r, 0), M.rock, 'desert_rock_' + i, { x, y: TOP + r * 0.7, z, ry: i * 2 }));
}

function sea(THREE, g, M) {
  hexBase(THREE, g, M, M.deepWater, M.water);
}

function harbor(THREE, g, M) {
  hexBase(THREE, g, M, M.deepWater, M.water);
  const deckY = TOP + 0.055, w = 0.16;
  for (let i = 0; i < 7; i++)
    add(THREE, g, new THREE.BoxGeometry(0.038, 0.014, w), M.wood, 'plank_' + i, { x: 0.185 + i * 0.044, y: deckY, z: 0.10 });
  [[0.19, 0.03], [0.19, 0.17], [0.32, 0.03], [0.32, 0.17], [0.45, 0.03], [0.45, 0.17]].forEach(([x, z], i) =>
    add(THREE, g, new THREE.CylinderGeometry(0.013, 0.013, deckY - 0.02, 10), M.wood, 'pile_' + i, { x, y: (deckY - 0.02) / 2 + 0.02, z }));
  add(THREE, g, new THREE.BoxGeometry(0.055, 0.055, 0.055), M.woodLight, 'crate_0', { x: 0.40, y: deckY + 0.007 + 0.0275, z: 0.065, ry: 0.2 });
  add(THREE, g, new THREE.BoxGeometry(0.045, 0.045, 0.045), M.woodLight, 'crate_1', { x: 0.345, y: deckY + 0.007 + 0.0225, z: 0.14, ry: 0.6 });
  add(THREE, g, new THREE.CylinderGeometry(0.011, 0.013, 0.045, 10), M.wood, 'bollard', { x: 0.21, y: deckY + 0.007 + 0.0225, z: 0.15 });
  add(THREE, g, new THREE.TorusGeometry(0.020, 0.007, 10, 20), M.rope, 'rope_coil', { x: 0.26, y: deckY + 0.011, z: 0.055, rx: Math.PI / 2 });
  // small sailboat moored beside the dock
  const bx = -0.10, bz = -0.22;
  add(THREE, g, new THREE.SphereGeometry(0.07, 20, 14), M.bark, 'boat_hull', { x: bx, y: TOP + 0.010, z: bz, sx: 1.9, sy: 0.55, sz: 0.85, ry: 0.5 });
  add(THREE, g, new THREE.SphereGeometry(0.07, 20, 14), M.woodLight, 'boat_deck', { x: bx, y: TOP + 0.014, z: bz, sx: 1.70, sy: 0.48, sz: 0.70, ry: 0.5 });
  add(THREE, g, new THREE.CylinderGeometry(0.006, 0.006, 0.20, 8), M.bark, 'boat_mast', { x: bx, y: TOP + 0.14, z: bz });
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(0.095, 0); sailShape.lineTo(0, 0.14); sailShape.lineTo(0, 0);
  const sailGeo = new THREE.ExtrudeGeometry(sailShape, { depth: 0.004, bevelEnabled: false });
  const sail = new THREE.Mesh(sailGeo, M.canvas);
  sail.name = 'boat_sail';
  sail.position.set(bx + Math.cos(0.5) * 0.012, TOP + 0.085, bz - Math.sin(0.5) * 0.012);
  sail.rotation.y = 0.5;
  g.add(sail);
}

const BUILDERS = { forest, pasture, fields, hills, mountains, desert, sea, harbor };

export function buildTile(THREE, kind, opts = {}) {
  SKIP_TOKEN = !!opts.noToken;
  const g = new THREE.Group();
  g.name = 'catan_' + kind + '_tile';
  const M = makeMats(THREE);
  BUILDERS[kind](THREE, g, M);
  return g;
}
