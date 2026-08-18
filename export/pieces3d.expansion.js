// Expansion player pieces for the 3D board — ship, pirate, knight, wall, metropolis.
// buildExpansionPiece(THREE, kind, {color, glow, scale, rank, active}) → THREE.Group,
// base resting at y=0, same contract as export/pieces3d.js buildPiece().
// Place on a tile surface at y = 0.09 (terrain TOP from tiles3d.js).
// Pieces are scaled 1.3× by default for legibility; pass {scale:1} for contract size.
// Glow is on by default: emissive paint plus two additive halo shells.
//
// Ship and pirate lie along local +x, like a road, so the board can reuse the road's
// midpoint + rotation math for sea edges. Knight, wall and metropolis sit on a vertex.

// Mirrors export/pieces3d.js — kept local so this module imports nothing.
export const PIECE_COLORS = {
  crimson: 0xff4d5e,
  azure: 0x3fa9ff,
  amber: 0xffa32e,
  ivory: 0xf2f0e6,
  cyan: 0x2ff2d8,
  magenta: 0xff44b8,
  violet: 0xa96bff,
  lime: 0xc6ff3d,
};

export const ROBBER_COLOR = 0x707790;

// dim < 1 darkens the emissive without changing the paint — an inactive knight
function mats(THREE, color, glow, dim = 1) {
  const base = new THREE.Color(color);
  const paint = new THREE.MeshStandardMaterial({
    color, roughness: glow ? 0.35 : 0.55, flatShading: true,
    emissive: glow ? base.clone() : new THREE.Color(0x000000),
    emissiveIntensity: glow ? 0.65 * dim : 0,
  });
  paint.name = 'piece_paint';
  const dark = new THREE.MeshStandardMaterial({
    color: base.clone().multiplyScalar(0.45), roughness: 0.7, flatShading: true,
    emissive: glow ? base.clone().multiplyScalar(0.6) : new THREE.Color(0x000000),
    emissiveIntensity: glow ? 0.5 * dim : 0,
  });
  dark.name = 'piece_trim';
  const lit = new THREE.MeshStandardMaterial({
    color: 0xfff4cf, roughness: 0.3,
    emissive: new THREE.Color(0xffe6a2), emissiveIntensity: (glow ? 1.8 : 0.5) * dim,
  });
  lit.name = 'piece_window_light';
  const shadow = new THREE.MeshStandardMaterial({ color: 0x12141c, roughness: 1 });
  shadow.name = 'piece_shadow';
  return { paint, dark, lit, shadow, glow, dim };
}

// additive back-side shell, scaled up about the piece base — a cheap neon bloom
function haloShell(THREE, meshes, color, scale, opacity, name) {
  const shell = new THREE.Group();
  shell.name = name;
  const m = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.BackSide,
  });
  m.name = 'piece_glow';
  for (const o of meshes) {
    const c = new THREE.Mesh(o.geometry, m);
    c.name = o.name + '_glow';
    c.position.copy(o.position);
    c.rotation.copy(o.rotation);
    c.scale.copy(o.scale);
    shell.add(c);
  }
  shell.scale.setScalar(scale);
  return shell;
}

// Rank insignia metal: bronze / brass / gold. Fixed hues, never the player's, so rank
// reads as colour while the body keeps the player colour for ownership.
const RANK_METAL = [0xa06a34, 0xe0b15e, 0xf7dc94];

function rankMat(THREE, r, glow, dim) {
  const c = RANK_METAL[r - 1];
  const m = new THREE.MeshStandardMaterial({
    color: c, roughness: 0.34, metalness: 0.45, flatShading: true,
    emissive: new THREE.Color(c), emissiveIntensity: (glow ? 0.55 : 0.12) * dim,
  });
  m.name = 'piece_rank_' + r;
  return m;
}

// triangular prism, length along x, ridge up
function prism(THREE, rd, len) {
  const g = new THREE.CylinderGeometry(rd, rd, len, 3, 1);
  g.rotateY(Math.PI / 2);
  g.rotateZ(Math.PI / 2);
  return g;
}

function add(g, mesh, name, x, y, z) {
  mesh.name = name;
  mesh.position.set(x, y, z);
  g.add(mesh);
  return mesh;
}

// ---- Voyages ----

// A player's ship: hull along +x, one pale sail, pennant at the masthead.
function ship(THREE, g, M) {
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.014, 0.068), M.dark), 'ship_keel', 0, 0.007, 0);
  const hull = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 10), M.paint), 'ship_hull', 0, 0.038, 0);
  hull.scale.set(2.0, 0.58, 0.60);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.212, 0.008, 0.082), M.dark), 'ship_gunwale', 0, 0.068, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.004, 0.038), M.dark), 'ship_deck', 0, 0.072, 0);
  // prow and stern
  const prow = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.095, 10), M.paint), 'ship_prow', 0.148, 0.048, 0);
  prow.rotation.z = -1.35;
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), M.dark), 'ship_prow_cap', 0.176, 0.070, 0);
  const stern = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.062, 10), M.paint), 'ship_stern', -0.120, 0.052, 0);
  stern.rotation.z = 1.05;
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), M.lit), 'ship_stern_lantern', -0.108, 0.086, 0);
  // mast, sail, pennant
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.150, 8), M.dark), 'ship_mast', -0.004, 0.138, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.078, 0.003), M.lit), 'ship_sail', 0.014, 0.142, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.015, 0.005), M.paint), 'ship_sail_band', 0.014, 0.142, 0);
  const yard = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.102, 6), M.dark), 'ship_yard', 0.014, 0.182, 0);
  yard.rotation.z = Math.PI / 2;
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.011, 0.002), M.paint), 'ship_pennant', 0.009, 0.206, 0);
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), M.lit), 'ship_masthead', -0.004, 0.214, 0);
}

// The sea's robber: a neutral longship. Menacing, low glow.
function pirate(THREE, g, M) {
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.255, 0.014, 0.070), M.dark), 'pirate_keel', 0, 0.007, 0);
  const hull = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.064, 16, 10), M.paint), 'pirate_hull', 0, 0.038, 0);
  hull.scale.set(2.15, 0.48, 0.58);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.230, 0.007, 0.080), M.dark), 'pirate_gunwale', 0, 0.058, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.150, 0.004, 0.036), M.dark), 'pirate_deck', 0, 0.064, 0);
  // dragon prow
  const prow = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.090, 8), M.paint), 'pirate_prow', 0.152, 0.052, 0);
  prow.rotation.z = -1.32;
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.dark), 'pirate_prow_head', 0.188, 0.086, 0);
  const horn = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.024, 6), M.dark), 'pirate_prow_horn', 0.190, 0.104, 0);
  horn.rotation.z = -0.4;
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), M.lit), 'pirate_prow_eye', 0.196, 0.086, 0.010);
  const stern = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.070, 8), M.paint), 'pirate_stern', -0.146, 0.056, 0);
  stern.rotation.z = 1.12;
  // shields on the gunwale
  for (let i = 0; i < 3; i++) {
    const s = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.004, 10), M.dark),
      'pirate_shield_' + i, -0.055 + i * 0.055, 0.056, 0.040);
    s.rotation.x = Math.PI / 2;
  }
  // oars
  for (let i = 0; i < 3; i++) {
    const o = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, 0.070, 6), M.dark),
      'pirate_oar_' + i, -0.050 + i * 0.055, 0.034, -0.062);
    o.rotation.set(0, 0.35, Math.PI / 2 - 0.25);
  }
  // black square sail with a slate band
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.150, 8), M.dark), 'pirate_mast', -0.004, 0.136, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.100, 0.082, 0.003), M.shadow), 'pirate_sail', 0.012, 0.140, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.100, 0.014, 0.005), M.paint), 'pirate_sail_band', 0.012, 0.140, 0);
  const yard = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.108, 6), M.dark), 'pirate_yard', 0.012, 0.182, 0);
  yard.rotation.z = Math.PI / 2;
}

// ---- The Realm ----

// An armoured knight on a shield base. rank 1|2|3 reads as height + crest + base pips;
// active raises the sword and banner and keeps full glow, inactive lowers both.
function knight(THREE, g, M, rank, active) {
  const r = Math.min(3, Math.max(1, rank | 0));
  const RM = rankMat(THREE, r, M.glow !== false, M.dim ?? 1);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.034, 0.012, 14), M.dark), 'knight_base', 0, 0.006, 0);
  const rim = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.030, 0.0035, 8, 18), M.paint), 'knight_base_rim', 0, 0.013, 0);
  rim.rotation.x = Math.PI / 2;
  // rank pips on the front of the base
  for (let i = 0; i < r; i++)
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.004, 8), RM),
      'knight_pip_' + i, -((r - 1) / 2) * 0.011 + i * 0.011, 0.014, 0.021);

  const bodyH = 0.044 + r * 0.009;
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.028, 0.016), M.dark), 'knight_greaves', 0, 0.026, 0);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.025, bodyH, 12), M.paint), 'knight_body', 0, 0.040 + bodyH / 2, 0);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.005, 12), M.dark), 'knight_belt', 0, 0.046, 0);
  // rank bands up the cuirass: one at rank 1, three at rank 3
  for (let i = 0; i < r; i++) {
    const h = 0.017 + i * 0.012, rr = 0.0252 - 0.008 * (h / bodyH);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(rr, rr + 0.0008, 0.0055, 12), RM), 'knight_rank_band_' + i, 0, 0.040 + h, 0);
  }
  const shoulderY = 0.040 + bodyH;
  [-1, 1].forEach((s, i) =>
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), M.paint), 'knight_pauldron_' + i, s * 0.020, shoulderY - 0.004, 0));
  if (r >= 2)
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0180, 0.0195, 0.0065, 12), RM), 'knight_gorget', 0, shoulderY + 0.001, 0);
  if (r === 3)
    [-1, 1].forEach((s, i) =>
      add(g, new THREE.Mesh(new THREE.SphereGeometry(0.0078, 10, 8), RM), 'knight_pauldron_cap_' + i, s * 0.020, shoulderY + 0.005, 0));
  // helm with a lit visor slit
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.017, 14, 10), M.dark), 'knight_helm', 0, shoulderY + 0.016, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.004), M.lit), 'knight_visor', 0, shoulderY + 0.014, 0.015);
  // crest by rank
  const crestY = shoulderY + 0.032;
  if (r === 1) {
    const p = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.034, 6), RM), 'knight_plume_0', 0, crestY + 0.008, -0.003);
    p.rotation.x = 0.18;
  } else if (r === 2) {
    [-1, 1].forEach((s, i) => {
      const p = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.032, 6), RM), 'knight_plume_' + i, s * 0.010, crestY + 0.007, -0.003);
      p.rotation.set(0.18, 0, s * 0.30);
    });
  } else {
    [-1, 1].forEach((s, i) => {
      const w = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.011, 0.003), RM), 'knight_wing_' + i, s * 0.014, crestY - 0.001, -0.002);
      w.rotation.set(0, 0, s * 0.55);
    });
    add(g, new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.030, 6), M.lit), 'knight_crest_spike', 0, crestY + 0.008, -0.002);
  }
  // sword: raised when active, lowered at rest. Geometry origins sit at the grip so
  // one shared rotation swings the whole weapon — no sub-group (the halo shells copy
  // local transforms, so every mesh stays a direct child).
  const hx = 0.030, hy = shoulderY - 0.016, hz = 0.004, swing = active ? -0.12 : -1.45;
  const bladeGeo = new THREE.BoxGeometry(0.005, 0.072, 0.004);
  bladeGeo.translate(0, 0.045, 0);
  add(g, new THREE.Mesh(bladeGeo, M.lit), 'knight_blade', hx, hy, hz).rotation.z = swing;
  const hiltGeo = new THREE.BoxGeometry(0.020, 0.006, 0.006);
  hiltGeo.translate(0, 0.008, 0);
  add(g, new THREE.Mesh(hiltGeo, M.paint), 'knight_hilt', hx, hy, hz).rotation.z = swing;
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.016, 8), M.dark), 'knight_grip', hx, hy, hz).rotation.z = swing;
  // banner: raised and open when active, furled and dipped at rest
  const bx = -0.030, by = 0.014, bz = -0.002, dip = active ? 0.06 : 0.62;
  const staffGeo = new THREE.CylinderGeometry(0.0022, 0.0022, 0.080, 6);
  staffGeo.translate(0, 0.040, 0);
  add(g, new THREE.Mesh(staffGeo, M.dark), 'knight_banner_staff', bx, by, bz).rotation.z = dip;
  const flagGeo = new THREE.BoxGeometry(active ? 0.026 : 0.008, 0.017, 0.002);
  flagGeo.translate(active ? 0.014 : 0.005, active ? 0.068 : 0.060, 0);
  add(g, new THREE.Mesh(flagGeo, M.paint), 'knight_banner_flag', bx, by, bz).rotation.z = dip;
}

// City wall: a low crenellated arc that rings a city's base on the same vertex.
function wall(THREE, g, M) {
  const R = 0.100, SEGS = 9, SPAN = Math.PI * 1.45, START = -SPAN / 2 + Math.PI / 2;
  for (let i = 0; i < SEGS; i++) {
    const a = START + (i / (SEGS - 1)) * SPAN;
    const x = Math.cos(a) * R, z = Math.sin(a) * R, ry = -a - Math.PI / 2;
    const gate = i === Math.floor(SEGS / 2);
    const h = gate ? 0.020 : 0.030;
    const seg = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.061, h, 0.015), M.paint), 'wall_seg_' + i, x, h / 2, z);
    seg.rotation.y = ry;
    const cop = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.006, 0.020), M.dark), 'wall_coping_' + i, x, h + 0.003, z);
    cop.rotation.y = ry;
    if (gate) {
      const arch = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.014, 0.004), M.lit), 'wall_gate_light', x, 0.013, z);
      arch.rotation.y = ry;
    } else if (i % 2 === 0) {
      const m = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.014, 0.018), M.dark), 'wall_merlon_' + i, x, h + 0.013, z);
      m.rotation.y = ry;
    } else {
      const s = add(g, new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.004), M.lit), 'wall_slit_' + i,
        x + Math.cos(a) * 0.009, 0.018, z + Math.sin(a) * 0.009);
      s.rotation.y = ry;
    }
  }
  // corner towers at the open ends
  [START, START + SPAN].forEach((a, i) => {
    const x = Math.cos(a) * R, z = Math.sin(a) * R;
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.042, 10), M.paint), 'wall_tower_' + i, x, 0.021, z);
    add(g, new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.020, 10), M.dark), 'wall_tower_roof_' + i, x, 0.052, z);
  });
}

// Metropolis: taller than a city, twin towers, banner raised. Same vertex footprint.
function metropolis(THREE, g, M) {
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.156, 0.008, 0.086), M.dark), 'metro_foundation', 0, 0.004, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.142, 0.064, 0.072), M.paint), 'metro_hall', 0, 0.040, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.146, 0.005, 0.076), M.dark), 'metro_belt_course', 0, 0.038, 0);
  const hallRoof = add(g, new THREE.Mesh(prism(THREE, 0.046, 0.146), M.dark), 'metro_hall_roof', 0, 0.086, 0);
  hallRoof.scale.set(1, 0.62, 0.92);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.150, 0.004, 0.004), M.paint), 'metro_hall_ridge', 0, 0.113, 0);
  // twin towers
  [-1, 1].forEach((s, i) => {
    const tx = s * 0.048;
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.050, 0.150, 0.052), M.paint), 'metro_tower_' + i, tx, 0.079, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([qx, qz], k) =>
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.150, 0.006), M.dark), 'metro_quoin_' + i + '_' + k,
        tx + qx * 0.024, 0.079, qz * 0.024));
    const roof = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.040, 0.058, 4), M.dark), 'metro_tower_roof_' + i, tx, 0.183, 0);
    roof.rotation.y = Math.PI / 4;
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), M.lit), 'metro_tower_finial_' + i, tx, 0.216, 0);
    [0.058, 0.104, 0.142].forEach((y, k) =>
      add(g, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.003), M.lit), 'metro_window_tower_' + i + '_' + k, tx, y, 0.027));
  });
  // great banner between the towers
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.090, 8), M.dark), 'metro_banner_staff', 0, 0.158, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.024, 0.002), M.paint), 'metro_banner', 0.019, 0.188, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.005, 0.004), M.lit), 'metro_banner_hem', 0.019, 0.177, 0);
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.005, 10, 8), M.lit), 'metro_banner_finial', 0, 0.206, 0);
  // gate, steps and hall windows
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.038, 0.004), M.dark), 'metro_gate', 0, 0.027, 0.037);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.026, 0.003), M.lit), 'metro_gate_light', 0, 0.026, 0.040);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.005, 0.012), M.dark), 'metro_step', 0, 0.0105, 0.043);
  [-0.030, 0.030].forEach((x, i) =>
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.013, 0.003), M.lit), 'metro_window_hall_' + i, x, 0.052, 0.0365));
}

const BUILDERS = {
  ship, pirate, wall, metropolis,
  knight: (THREE, g, M, opts) => knight(THREE, g, M, opts.rank ?? 1, opts.active !== false),
};

export const EXPANSION_PIECE_KINDS = Object.keys(BUILDERS);

export function buildExpansionPiece(THREE, kind, opts = {}) {
  const g = new THREE.Group();
  g.name = 'piece_' + kind;
  // the pirate is neutral like the robber, and stays matte unless asked
  const isNeutral = kind === 'pirate';
  const color = opts.color ?? (isNeutral ? ROBBER_COLOR : PIECE_COLORS.crimson);
  const glow = opts.glow ?? !isNeutral;
  // an inactive knight keeps its paint but loses most of its light
  const dim = kind === 'knight' && opts.active === false ? 0.35 : 1;
  BUILDERS[kind](THREE, g, mats(THREE, color, glow, dim), opts);
  if (glow) {
    const meshes = g.children.filter(o => o.isMesh);
    g.add(haloShell(THREE, meshes, color, 1.09, 0.22 * dim, 'glow_inner'));
    g.add(haloShell(THREE, meshes, color, 1.24, 0.11 * dim, 'glow_outer'));
  }
  g.scale.setScalar(opts.scale ?? 1.3);
  return g;
}
