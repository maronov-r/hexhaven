// <hex-board> — the 3D island, driven by a Hexhaven game state object.
// Owns its renderer, camera, hand-rolled orbit controls, the living-detail
// animation loop, and the projected number-token overlay.
// No import map needed: three.js comes from an absolute URL, and tiles3d/pieces3d
// take THREE as an argument rather than importing it.
import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';
import { buildTile } from './export/tiles3d.js';
import { buildExpansionTile, EXPANSION_KINDS, registerExpansionLife, stepExpansionLife } from './export/tiles3d.expansion.js';
import { buildPiece, ROBBER_COLOR } from './export/pieces3d.js';

const R = 0.5, SC = 1.02, STEP = Math.PI / 3, TOPY = 0.09;
const HEX_SIZE = 56;                    // game.js board units
const K = (R * SC) / HEX_SIZE;          // game px → world units
const KIND = { wood: 'forest', brick: 'hills', sheep: 'pasture', wheat: 'fields', ore: 'mountains', desert: 'desert' };
const NEIGHBOURS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
// the engine's flat player colours → their neon-glow equivalents
const NEON = { '#e0555a': 0xff4d5e, '#4c9ee3': 0x3fa9ff, '#e8e4d8': 0xf2f0e6, '#e58f3c': 0xffa32e };
const toWorld = (x, y) => [x * K, y * K];
const neon = css => NEON[String(css).toLowerCase()] ?? parseInt(String(css).slice(1), 16);
const spin = () => Math.floor(Math.random() * 6) * STEP;
const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };

const CHIP_CSS = `
@keyframes hb-pop{0%{box-shadow:0 0 0 0 rgba(224,177,94,.9)}70%{box-shadow:0 0 0 14px rgba(224,177,94,0)}100%{box-shadow:0 0 0 0 rgba(224,177,94,0)}}
.hb-chip{position:absolute;left:0;top:0;width:34px;height:34px;border-radius:50%;
  background:radial-gradient(circle at 38% 30%,#f2e6c4,#e2d0a6 70%,#cdb98d);
  border:1px solid rgba(60,40,16,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:"Iowan Old Style",Palatino,Georgia,serif;line-height:1;transform-origin:50% 50%;
  box-shadow:0 3px 7px rgba(0,0,0,.45);transition:opacity .2s}
.hb-chip b{font-size:17px;font-weight:600;letter-spacing:-.02em}
.hb-chip i{display:flex;gap:1.5px;margin-top:2.5px}
.hb-chip i span{width:2.5px;height:2.5px;border-radius:50%;background:currentColor;display:block}
.hb-chip.hot{animation:hb-pop 1s ease-out}
.hb-robber{filter:saturate(.4) brightness(.62)}
`;

class HexBoard extends HTMLElement {
  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    this.style.display = 'block';
    this.style.position = 'relative';
    this.style.overflow = 'hidden';

    const style = document.createElement('style');
    style.textContent = CHIP_CSS;
    this.appendChild(style);

    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    this.appendChild(this._canvas);

    this._overlay = document.createElement('div');
    this._overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    this.appendChild(this._overlay);

    this._az = 0; this._po = 0.82; this._rad = 5.3; this._inset = 0; this._insetY = 0; this._shiftPx = 0;
    this._target = new THREE.Vector3(0, 0.05, 0);
    this._chips = [];
    this._life = { eagles: [], wings: [], flocks: [], canopies: [], boats: [], choppers: [], grass: [] };

    this._scene = new THREE.Scene();
    this._scene.background = null;
    this._scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(4, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 20 });
    this._scene.add(sun);

    this._camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: true });
    this._renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;

    this._bindInput();
    this._resize();
    this._t0 = performance.now();
    this._renderer.setAnimationLoop(() => this._frame());

    window.__hexBoard = this;
    document.dispatchEvent(new CustomEvent('hex-board-ready', { detail: this }));
  }

  disconnectedCallback() {
    this._renderer?.setAnimationLoop(null);
    this._renderer?.dispose();
  }

  _bindInput() {
    const el = this._canvas;
    const pts = new Map();               // active pointers by id
    let lastDist = 0;
    const MINR = 2.4, MAXR = 15;
    const twoDist = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    const down = e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.style.cursor = 'grabbing';
      if (pts.size === 2) lastDist = twoDist();
    };
    const move = e => {
      const p = pts.get(e.pointerId); if (!p) return;
      if (pts.size === 2) {                       // exactly two fingers -> pinch zoom
        p.x = e.clientX; p.y = e.clientY;
        const d = twoDist();
        if (lastDist && d) { this._userZoom = true; this._rad = Math.min(MAXR, Math.max(MINR, this._rad * (lastDist / d))); }
        lastDist = d;
      } else if (pts.size === 1) {                // one finger -> orbit / look around
        this._az -= (e.clientX - p.x) * 0.006;
        this._po = Math.min(1.42, Math.max(0.22, this._po - (e.clientY - p.y) * 0.005));
        p.x = e.clientX; p.y = e.clientY;
      } else { p.x = e.clientX; p.y = e.clientY; } // 3+ fingers: track only, never zoom
    };
    const up = e => {
      if (pts.delete(e.pointerId)) { try { el.releasePointerCapture(e.pointerId); } catch (_) {} }
      if (pts.size < 2) lastDist = 0;
      if (!pts.size) el.style.cursor = 'grab';
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    // release/cancel listened on window: a finger lifted off the canvas still clears,
    // so a stale pointer can never wedge the gesture into permanent pinch-zoom mode
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('wheel', e => {
      e.preventDefault();
      this._userZoom = true;
      this._rad = Math.min(MAXR, Math.max(MINR, this._rad * (1 + e.deltaY * 0.0012)));
    }, { passive: false });
  }

  /** Reserve room for the floating chrome: horizontal, vertical, and how far to
   *  bias the island left so it centres in the space the panels leave behind. */
  setPanels(x, y, shift) {
    this._inset = x || 0;
    this._insetY = y || 0;
    this._shiftPx = shift || 0;
    this._userZoom = false;
    this._resize();
  }

  /** Distance that frames the island plus its water ring in the usable region. */
  _fit() {
    if (this._userZoom) return;
    const worldR = this._worldR || 2.9, w = this._w || 1, h = this._h || 1;
    const usableW = Math.max(220, w - (this._inset || 0));
    const usableH = Math.max(180, h - (this._insetY || 0));
    const vf = Math.tan((this._camera.fov * Math.PI / 180) / 2);
    // half-extent visible across the usable box, expressed against the full frame
    const d = worldR * h / (vf * Math.min(usableW, usableH));
    this._rad = Math.min(18, Math.max(2.4, d * 1.02));
  }

  _resize() {
    const w = this.clientWidth || 1, h = this.clientHeight || 1;
    this._w = w; this._h = h;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h, false);
    this._fit();
  }

  // ---- board construction from engine state ----
  /** Full rebuild: terrain, water, harbours, tokens, then pieces. */
  setState(S) {
    this._S = S;
    if (this._terrain) { this._scene.remove(this._terrain); this._dispose(this._terrain); }
    for (const k in this._life) this._life[k].length = 0;
    this._overlay.textContent = '';
    this._chips = [];
    this._terrain = new THREE.Group();
    this._buildTerrain();
    this._scene.add(this._terrain);
    this._buildPieces();
  }

  /** Cheap update after a move — only the pieces group is rebuilt. */
  refresh() { if (this._S) this._buildPieces(); }

  _dispose(g) {
    const mats = new Set();
    g.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
    });
    mats.forEach(m => m.dispose());
  }

  _buildTerrain() {
    const S = this._S;
    // terrain — one tile per engine hex, each spun to a random orientation
    const spins = this._spins || (this._spins = {});
    for (const h of S.board.hexes) {
      const [x, z] = toWorld(h.x, h.y);
      if (spins[h.id] === undefined) spins[h.id] = spin();
      // h.art lets a hex render an expansion tile without touching the terrain rules
      this._addTile(h.art || KIND[h.terrain] || 'desert', x, z, spins[h.id]);
      if (h.num) this._addChip(h, x, z);
    }

    // water ring, with harbours sitting where the engine put its ports.
    // ring sits one step outside the largest land ring, so it adapts to map size.
    const ports = this._portHexes(S);
    const land = new Set(S.board.hexes.map(h => h.q + ',' + h.r));
    const R = S.board.hexes.reduce((m, h) => Math.max(m, (Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r)) / 2), 0);
    const WR = R + 1;
    // world radius that frames the whole island + its water ring (drives the camera fit)
    { let mr = 0; for (const [q, r] of [[WR, 0], [0, WR], [-WR, WR], [-WR, 0], [0, -WR], [WR, -WR]]) {
        const [wx, wz] = toWorld(HEX_SIZE * Math.sqrt(3) * (q + r / 2), HEX_SIZE * 1.5 * r);
        mr = Math.max(mr, Math.hypot(wx, wz)); }
      this._worldR = mr + 0.55; }
    for (let q = -WR; q <= WR; q++) for (let r = -WR; r <= WR; r++) {
      if (Math.abs(q + r) > WR) continue;
      if ((Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2 !== WR) continue;
      const key = q + ',' + r;
      if (land.has(key)) continue;
      const [x, z] = toWorld(HEX_SIZE * Math.sqrt(3) * (q + r / 2), HEX_SIZE * 1.5 * r);
      const port = ports.get(key);
      if (!port) { this._addTile('sea', x, z, spin()); continue; }
      const [lx, lz] = toWorld(port.land.x, port.land.y);
      const ux = lx - x, uz = lz - z, len = Math.hypot(ux, uz) || 1;
      this._addTile('harbor', x, z, Math.round(Math.atan2(-uz / len, ux / len) / STEP) * STEP);
    }
  }

  _buildPieces() {
    const S = this._S;
    if (this._pieces) { this._scene.remove(this._pieces); this._dispose(this._pieces); }
    this._pieces = new THREE.Group();

    for (const v of Object.values(S.board.V)) {
      if (!v.bld) continue;
      const [x, z] = toWorld(v.x, v.y);
      this._addPiece(v.bld.type === 'city' ? 'city' : 'settlement',
        neon(S.players[v.bld.p].color), x, z, Math.atan2(x, z));
    }
    for (const e of Object.values(S.board.E)) {
      if (e.road === null || e.road === undefined) continue;
      const a = S.board.V[e.a], b = S.board.V[e.b];
      const [ax, az] = toWorld(a.x, a.y), [bx, bz] = toWorld(b.x, b.y);
      this._addPiece('road', neon(S.players[e.road].color), (ax + bx) / 2, (az + bz) / 2,
        Math.atan2(-(bz - az), bx - ax));
    }

    const rh = S.board.hexes[S.board.robber];
    if (rh) {
      const [x, z] = toWorld(rh.x, rh.y);
      this._addPiece('robber', ROBBER_COLOR, x - 0.16, z - 0.24, 0.5);
    }
    this._scene.add(this._pieces);
    this._markRobberChip();
  }

  _addTile(kind, x, z, ry) {
    const tile = EXPANSION_KINDS.includes(kind)
      ? buildExpansionTile(THREE, kind, { noToken: true })
      : buildTile(THREE, kind, { noToken: true });
    tile.position.set(x, 0, z);
    tile.rotation.y = ry;
    // translucent props (smoke, mist, glints) opt out of casting — a puff must not
    // drop a hard blob on the next hex
    tile.traverse(o => { if (o.isMesh) { if (!o.userData.noShadow) o.castShadow = true; o.receiveShadow = true; } });
    this._registerLife(tile);
    registerExpansionLife(THREE, tile, this._life);
    this._terrain.add(tile);
  }

  _addPiece(kind, color, x, z, ry) {
    const p = buildPiece(THREE, kind, { color });
    p.position.set(x, TOPY, z);
    p.rotation.y = ry;
    p.traverse(o => { if (o.isMesh && !o.name.endsWith('_glow')) { o.castShadow = true; o.receiveShadow = true; } });
    this._pieces.add(p);
  }

  /** For each engine port, the water hex just outside its coastal edge. */
  _portHexes(S) {
    const out = new Map();
    for (const port of S.board.ports || []) {
      const e = S.board.E[port.edge];
      if (!e) continue;
      const land = S.board.hexes[e.hexes[0]];
      const a = S.board.V[e.a], b = S.board.V[e.b];
      const mx = (a.x + b.x) / 2 - land.x, my = (a.y + b.y) / 2 - land.y;
      let best = null, bd = -Infinity;
      for (const [dq, dr] of NEIGHBOURS) {
        const nx = HEX_SIZE * Math.sqrt(3) * (dq + dr / 2), ny = HEX_SIZE * 1.5 * dr;
        const d = (nx * mx + ny * my) / Math.hypot(nx, ny);
        if (d > bd) { bd = d; best = [dq, dr]; }
      }
      const q = land.q + best[0], r = land.r + best[1];
      out.set(q + ',' + r, { q, r, land, type: port.type });
    }
    return out;
  }

  // ---- number tokens as projected DOM chips ----
  _addChip(h, x, z) {
    const el = document.createElement('div');
    el.className = 'hb-chip';
    const red = h.num === 6 || h.num === 8;
    el.style.color = red ? '#a8321f' : '#4a3524';
    const pips = PIPS[h.num] || 0;
    el.innerHTML = '<b>' + h.num + '</b><i>' + '<span></span>'.repeat(pips) + '</i>';
    this._overlay.appendChild(el);
    this._chips.push({ el, hex: h.id, pos: new THREE.Vector3(x, 0.1, z) });
  }

  _markRobberChip() {
    for (const c of this._chips) c.el.classList.toggle('hb-robber', c.hex === this._S?.board.robber);
  }

  /** Flash the tokens that just paid out. */
  pulse(total) {
    for (const c of this._chips) {
      if (this._S.board.hexes[c.hex].num !== total) continue;
      c.el.classList.remove('hot');
      void c.el.offsetWidth;
      c.el.classList.add('hot');
    }
  }

  _syncChips() {
    const scale = Math.min(1.15, Math.max(0.42, 4.6 / this._rad));
    for (const c of this._chips) {
      const v = c.pos.clone().project(this._camera);
      const x = (v.x * 0.5 + 0.5) * this._w, y = (-v.y * 0.5 + 0.5) * this._h;
      c.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;
      c.el.style.opacity = v.z > 1 ? '0' : '1';
    }
  }

  // ---- placement picking: projected DOM markers over legal spots ----
  setPick(list, onPick) {
    this._onPick = onPick || null;
    if (!this._pickLayer) {
      this._pickLayer = document.createElement("div");
      this._pickLayer.style.cssText = "position:absolute;inset:0;pointer-events:none";
      this.appendChild(this._pickLayer);
    }
    this._pickLayer.textContent = "";
    this._pickEls = [];
    for (const t of (list || [])) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hb-pick hb-pick-" + (t.cls || "v");
      b.style.pointerEvents = "auto";
      const key = t.key;
      b.addEventListener("pointerdown", ev => ev.stopPropagation());
      b.addEventListener("click", ev => { ev.stopPropagation(); this._onPick && this._onPick(key); });
      this._pickLayer.appendChild(b);
      this._pickEls.push({ el: b, pos: new THREE.Vector3(t.wx, t.wy == null ? TOPY : t.wy, t.wz) });
    }
    this._syncPick();
  }
  clearPick() { if (this._pickLayer) this._pickLayer.textContent = ""; this._pickEls = []; }
  _syncPick() {
    const els = this._pickEls;
    if (!els || !els.length) return;
    for (const p of els) {
      const v = p.pos.clone().project(this._camera);
      const vis = v.z <= 1;
      p.el.style.display = vis ? "block" : "none";
      if (!vis) continue;
      const x = (v.x * 0.5 + 0.5) * this._w, y = (-v.y * 0.5 + 0.5) * this._h;
      p.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px)`;
    }
  }

  // ---- living details (same treatment as the standalone board demo) ----
  _registerLife(tile) {
    const L = this._life;
    const parts = tile.children.filter(o => o.name.startsWith('eagle_'));
    if (parts.length) {
      const flightY = parts.find(o => o.name === 'eagle_body').position.y;
      const pivot = new THREE.Group();
      pivot.position.set(0, flightY, 0);
      for (const p of parts) { p.position.y -= flightY; pivot.add(p); }
      tile.add(pivot);
      L.eagles.push({ pivot, y: flightY });
      for (const w of pivot.children.filter(o => o.name.startsWith('eagle_wing')))
        L.wings.push({ mesh: w, rx: w.rotation.x, rz: w.rotation.z });
    }
    const hulls = tile.children.filter(o => o.name.startsWith('boat_'));
    if (hulls.length) {
      const hull = hulls.find(o => o.name === 'boat_hull');
      const cx = hull.position.x, cz = hull.position.z;
      const orbit = new THREE.Group(), heel = new THREE.Group();
      heel.position.set(cx, 0, cz);
      for (const p of hulls) { p.position.x -= cx; p.position.z -= cz; heel.add(p); }
      orbit.add(heel); tile.add(orbit);
      L.boats.push({ orbit, heel, phase: Math.random() * Math.PI * 2 });
    }
    const swing = tile.children.filter(o => /^(lumberjack_arm|axe_handle|axe_head)$/.test(o.name));
    if (swing.length === 3) {
      const torso = tile.children.find(o => o.name === 'lumberjack_torso');
      const arm = swing.find(o => o.name === 'lumberjack_arm');
      const px = torso.position.x, py = arm.position.y, pz = torso.position.z;
      const pivot = new THREE.Group();
      pivot.position.set(px, py, pz);
      for (const p of swing) { p.position.x -= px; p.position.y -= py; p.position.z -= pz; pivot.add(p); }
      tile.add(pivot);
      L.choppers.push({ pivot, phase: Math.random() });
    }
    const byIndex = new Map();
    for (const o of tile.children) {
      const m = o.name.match(/^sheep_(?:head|cap)_(\d+)$/);
      if (!m) continue;
      if (!byIndex.has(m[1])) byIndex.set(m[1], { phase: Math.random() * Math.PI * 2, parts: [] });
      byIndex.get(m[1]).parts.push({ mesh: o, y: o.position.y });
    }
    for (const s of byIndex.values()) L.flocks.push(s);
    for (const o of tile.children) {
      if (/^grass_/.test(o.name)) L.grass.push({ mesh: o, rz: o.rotation.z, phase: o.position.x * 7.5 + o.position.z * 5 });
      else if (/^(canopy_low|canopy_top|sapling)_/.test(o.name)) L.canopies.push({
        mesh: o, x: o.position.x, rz: o.rotation.z,
        amp: o.name.startsWith('canopy_top') ? 1.7 : o.name.startsWith('sapling') ? 0.6 : 1,
        phase: o.position.x * 3.1 + o.position.z * 2.3,
      });
    }
  }

  _frame() {
    // size changes are picked up here rather than from a ResizeObserver, which
    // can trip "loop completed with undelivered notifications"
    if (this.clientWidth !== this._w || this.clientHeight !== this._h) this._resize();
    const t = ((performance.now() - this._t0) / 1000) * 2.6;
    const L = this._life;
    L.eagles.forEach((e, i) => {
      e.pivot.rotation.y = t * 0.22 + i * 1.7;
      e.pivot.position.y = e.y + Math.sin(t * 0.5 + i) * 0.022;
    });
    const flap = 1 + Math.sin(t * 4.2) * 0.8;
    for (const w of L.wings) { w.mesh.rotation.x = w.rx * flap; w.mesh.rotation.z = w.rz * flap; }
    for (const s of L.flocks) {
      const dip = (0.5 + 0.5 * Math.sin(t * 0.65 + s.phase)) * 0.012;
      for (const p of s.parts) p.mesh.position.y = p.y - dip;
    }
    for (const c of L.canopies) {
      const s = Math.sin(t * 0.85 + c.phase);
      c.mesh.position.x = c.x + s * 0.006 * c.amp;
      c.mesh.rotation.z = c.rz + s * 0.03 * c.amp;
    }
    for (const b of L.grass) {
      const s = Math.sin(t * 1.15 - b.phase);
      b.mesh.rotation.z = b.rz + 0.09 + s * 0.17;
      b.mesh.rotation.x = s * 0.05;
    }
    for (const b of L.boats) {
      b.orbit.rotation.y = Math.sin(t * 0.10 + b.phase) * 0.24;
      b.heel.rotation.z = Math.sin(t * 0.55 + b.phase) * 0.035;
      b.heel.position.y = Math.sin(t * 0.7 + b.phase) * 0.003;
    }
    for (const c of L.choppers) {
      const u = (t * 0.16 + c.phase) % 1;
      c.pivot.rotation.z = u < 0.55 ? -1.0 + 1.9 * (u / 0.55)
        : u < 0.68 ? 0.9 - 1.9 * ((u - 0.55) / 0.13) : -1.0;
    }
    stepExpansionLife(L, t);
    const d = this._rad, a = this._az, p = this._po;
    // slide the look-at point sideways so the island sits centred in the gap the
    // floating panels leave, without moving the horizon
    const vf = Math.tan((this._camera.fov * Math.PI / 180) / 2);
    const shift = (this._shiftPx || 0) * (2 * d * vf / (this._h || 1));
    this._target.set(shift * Math.cos(a), 0.05, -shift * Math.sin(a));
    this._camera.position.set(
      this._target.x + d * Math.sin(p) * Math.sin(a),
      this._target.y + d * Math.cos(p),
      this._target.z + d * Math.sin(p) * Math.cos(a));
    this._camera.lookAt(this._target);
    this._renderer.render(this._scene, this._camera);
    this._syncChips();
    this._syncPick();
  }
}

customElements.define('hex-board', HexBoard);
