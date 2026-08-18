// Player pieces for the 3D board — settlement (house), city, road — plus the robber.
// buildPiece(THREE, kind, {color, glow, scale}) → THREE.Group, base resting at y=0.
// Place on a tile surface at y = 0.09 (terrain TOP from tiles3d.js).
// Pieces are scaled 1.3× by default for legibility on the board; pass {scale:1} for
// the raw contract size. Glow is on by default: emissive paint plus two additive
// halo shells, so they read clearly against every terrain cap. {glow:false} = matte.

// High-visibility player colors — bright enough to carry an emissive glow and to
// separate from the board's greens, browns, sand and grey.
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

// the robber is neutral, not a player — slate rather than a player color
export const ROBBER_COLOR = 0x707790;

function mats(THREE, color, glow) {
  const base = new THREE.Color(color);
  const paint = new THREE.MeshStandardMaterial({
    color, roughness: glow ? 0.35 : 0.55, flatShading: true,
    emissive: glow ? base.clone() : new THREE.Color(0x000000),
    emissiveIntensity: glow ? 0.65 : 0,
  });
  paint.name = 'piece_paint';
  const dark = new THREE.MeshStandardMaterial({
    color: base.clone().multiplyScalar(0.45), roughness: 0.7, flatShading: true,
    emissive: glow ? base.clone().multiplyScalar(0.6) : new THREE.Color(0x000000),
    emissiveIntensity: glow ? 0.5 : 0,
  });
  dark.name = 'piece_trim';
  const lit = new THREE.MeshStandardMaterial({
    color: 0xfff4cf, roughness: 0.3,
    emissive: new THREE.Color(0xffe6a2), emissiveIntensity: glow ? 1.8 : 0.5,
  });
  lit.name = 'piece_window_light';
  const shadow = new THREE.MeshStandardMaterial({ color: 0x12141c, roughness: 1 });
  shadow.name = 'piece_shadow';
  return { paint, dark, lit, shadow };
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

function settlement(THREE, g, M) {
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.008, 0.072), M.dark), 'sett_foundation', 0, 0.004, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.052, 0.06), M.paint), 'sett_walls', 0, 0.034, 0);
  // corner posts
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) =>
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.052, 0.007), M.dark), 'sett_post_' + i, sx * 0.0355, 0.034, sz * 0.0285));
  const roof = add(g, new THREE.Mesh(prism(THREE, 0.047, 0.086), M.dark), 'sett_roof', 0, 0.070, 0);
  roof.scale.set(1, 0.75, 0.92);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.005, 0.005), M.paint), 'sett_ridge_beam', 0, 0.103, 0);
  // chimney with cap
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.032, 0.012), M.dark), 'sett_chimney', -0.024, 0.098, 0.010);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.004, 0.017), M.paint), 'sett_chimney_cap', -0.024, 0.116, 0.010);
  // doorway, step, lit windows
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.028, 0.004), M.dark), 'sett_door', 0.014, 0.022, 0.031);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.005, 0.009), M.dark), 'sett_step', 0.014, 0.0105, 0.036);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.013, 0.003), M.lit), 'sett_window_front', -0.018, 0.032, 0.0305);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.013, 0.003), M.lit), 'sett_window_back', 0.008, 0.032, -0.0305);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.013, 0.013), M.lit), 'sett_window_side', -0.0378, 0.032, -0.008);
}

function city(THREE, g, M) {
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.008, 0.082), M.dark), 'city_foundation', 0, 0.004, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.07), M.paint), 'city_base', 0, 0.0355, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.144, 0.005, 0.074), M.dark), 'city_belt_course', 0, 0.0345, 0);
  const baseRoof = add(g, new THREE.Mesh(prism(THREE, 0.045, 0.086), M.dark), 'city_base_roof', 0.032, 0.073, 0);
  baseRoof.scale.set(1, 0.6, 0.9);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.090, 0.004, 0.004), M.paint), 'city_base_ridge', 0.032, 0.100, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.026, 0.011), M.dark), 'city_chimney', 0.066, 0.088, 0);
  // tower
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.125, 0.07), M.paint), 'city_tower', -0.037, 0.0705, 0);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], i) =>
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.125, 0.007), M.dark), 'city_quoin_' + i, -0.037 + sx * 0.031, 0.0705, sz * 0.033));
  const towerRoof = add(g, new THREE.Mesh(prism(THREE, 0.048, 0.076), M.dark), 'city_tower_roof', -0.037, 0.145, 0);
  towerRoof.scale.set(1, 0.85, 1);
  // flag on the tower ridge
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.052, 8), M.dark), 'city_flagpole', -0.037, 0.212, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.015, 0.002), M.paint), 'city_flag', -0.024, 0.228, 0);
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.005, 10, 8), M.lit), 'city_flag_finial', -0.037, 0.240, 0);
  // doorway, step, lit windows
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.032, 0.004), M.dark), 'city_door', 0.032, 0.024, 0.036);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.005, 0.010), M.dark), 'city_step', 0.032, 0.0105, 0.041);
  [0.002, 0.062].forEach((x, i) =>
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 0.003), M.lit), 'city_window_base_' + i, x, 0.042, 0.0355));
  [0.048, 0.098].forEach((y, i) =>
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.003), M.lit), 'city_window_tower_' + i, -0.037, y, 0.0355));
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.015, 0.015), M.lit), 'city_window_tower_side', -0.0695, 0.074, 0);
}

// Hooded figure with a swag sack — blocks the hex it stands on.
function robber(THREE, g, M) {
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.014, 14), M.dark), 'robber_base', 0, 0.007, 0);
  const rim = add(g, new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.004, 8, 20), M.paint), 'robber_base_rim', 0, 0.014, 0);
  rim.rotation.x = Math.PI / 2;
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.036, 0.100, 14), M.dark), 'robber_robe', 0, 0.064, 0);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.006, 14), M.paint), 'robber_belt', 0, 0.056, 0);
  const cloak = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.030, 16, 12), M.dark), 'robber_cloak', 0, 0.082, -0.012);
  cloak.scale.set(1.2, 1.5, 0.5);
  add(g, new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), M.dark), 'robber_shoulders', 0, 0.112, 0);
  // hood shell, forward-tipped peak, and a face left in shadow but for the eyes
  const hood = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), M.dark), 'robber_hood', 0, 0.130, -0.002);
  hood.scale.set(1, 1.12, 1);
  const peak = add(g, new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.032, 12), M.dark), 'robber_hood_peak', 0, 0.152, -0.006);
  peak.rotation.x = -0.3;
  const face = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.014, 14, 12), M.shadow), 'robber_face', 0, 0.127, 0.011);
  face.scale.set(1, 1, 0.6);
  [-1, 1].forEach((s, i) =>
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), M.lit), 'robber_eye_' + i, s * 0.007, 0.130, 0.020));
  // swag sack slung over one shoulder
  const sack = add(g, new THREE.Mesh(new THREE.SphereGeometry(0.025, 16, 12), M.paint), 'robber_sack', 0.033, 0.112, -0.006);
  sack.scale.set(1, 1.1, 0.95);
  add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.007, 0.008, 10), M.dark), 'robber_sack_tie', 0.033, 0.135, -0.006);
  const arm = add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.044, 10), M.dark), 'robber_arm', 0.022, 0.104, 0.004);
  arm.rotation.z = -0.55;
}

function road(THREE, g, M) {
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.008, 0.044), M.dark), 'road_base', 0, 0.004, 0);
  // sleepers poking out past the rails
  for (let i = 0; i < 7; i++)
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.011, 0.054), M.dark), 'road_tie_' + i, -0.144 + i * 0.048, 0.0095, 0);
  add(g, new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.036), M.paint), 'road_bar', 0, 0.021, 0);
  const ridge = add(g, new THREE.Mesh(prism(THREE, 0.02, 0.34), M.dark), 'road_ridge', 0, 0.038, 0);
  ridge.scale.set(1, 0.55, 0.9);
  // glowing side lines down each flank
  [1, -1].forEach((side, i) =>
    add(g, new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.004, 0.002), M.lit), 'road_line_' + i, 0, 0.026, side * 0.019));
  // end posts capped with lanterns
  [1, -1].forEach((side, i) => {
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.052, 10), M.paint), 'road_post_' + i, side * 0.172, 0.026, 0);
    add(g, new THREE.Mesh(new THREE.SphereGeometry(0.0085, 10, 8), M.lit), 'road_lantern_' + i, side * 0.172, 0.058, 0);
  });
}

const BUILDERS = { settlement, city, robber, road };

export function buildPiece(THREE, kind, opts = {}) {
  const g = new THREE.Group();
  g.name = 'piece_' + kind;
  const color = opts.color ?? PIECE_COLORS.crimson;
  const glow = opts.glow !== false;
  BUILDERS[kind](THREE, g, mats(THREE, color, glow));
  if (glow) {
    const meshes = g.children.filter(o => o.isMesh);
    g.add(haloShell(THREE, meshes, color, 1.09, 0.22, 'glow_inner'));
    g.add(haloShell(THREE, meshes, color, 1.24, 0.11, 'glow_outer'));
  }
  g.scale.setScalar(opts.scale ?? 1.3);   // pieces read bigger on the board
  return g;
}
