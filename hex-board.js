// <hex-board> — the 3D island, driven by a Hexhaven game state object.
// Owns its renderer, camera, hand-rolled orbit controls (with inertia and eased
// reframing), the living-detail animation loop, piece drop-in / robber hop
// animations, hex picking, and the projected number-token overlay.
// No import map needed: three.js comes from an absolute URL, and tiles3d/pieces3d
// take THREE as an argument rather than importing it.
import * as THREE from 'https://unpkg.com/three@0.184.0/build/three.module.js';
import { buildTile } from './export/tiles3d.js';
import { buildExpansionTile, EXPANSION_KINDS, registerExpansionLife, stepExpansionLife } from './export/tiles3d.expansion.js';
import { buildPiece, ROBBER_COLOR } from './export/pieces3d.js';
import { buildExpansionPiece } from './export/pieces3d.expansion.js';

const R = 0.5, SC = 1.02, STEP = Math.PI / 3, TOPY = 0.09;
const HEX_SIZE = 56;                    // game.js board units
const K = (R * SC) / HEX_SIZE;          // game px → world units
const HEX_W = R * SC;                   // world circumradius of one hex
const KIND = { wood: 'forest', brick: 'hills', sheep: 'pasture', wheat: 'fields', ore: 'mountains', desert: 'desert', sea: 'sea' };
const NEIGHBOURS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
// the engine's flat player colours → their neon-glow equivalents
const NEON = { '#e0555a': 0xff4d5e, '#4c9ee3': 0x3fa9ff, '#e8e4d8': 0xf2f0e6, '#e58f3c': 0xffa32e,
  '#3bb6a6': 0x2ff2d8, '#9b6ee0': 0xa96bff, '#e05ea6': 0xff44b8, '#86c447': 0xc6ff3d };
const toWorld = (x, y) => [x * K, y * K];
const neon = css => NEON[String(css).toLowerCase()] ?? parseInt(String(css).slice(1), 16);
const spin = () => Math.floor(Math.random() * 6) * STEP;
const PIPS = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
const PORT_LABEL = { wood:'LUMBER', brick:'BRICK', sheep:'WOOL', wheat:'GRAIN', ore:'ORE', any:'ANY' };
const PORT_COL = { wood:'#3e7c4f', brick:'#c4633f', sheep:'#8fbf6a', wheat:'#e2b84b', ore:'#7c8ca6', any:'#5b7089' };
const PIECE_SCALE = { settlement: 1.95, city: 1.8, road: 1.3, robber: 1.75 };
const PO_DEFAULT = 0.8, PO_MIN = 0.2, PO_MAX = 1.3, MINR = 1.6;
const ease = { outBack: k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  outCubic: k => 1 - Math.pow(1 - k, 3), inOut: k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2 };

const CHIP_CSS = `
@keyframes hb-pop{0%{box-shadow:0 0 0 0 rgba(240,199,120,.95),0 3px 7px rgba(0,0,0,.45)}70%{box-shadow:0 0 0 16px rgba(240,199,120,0),0 3px 7px rgba(0,0,0,.45)}100%{box-shadow:0 0 0 0 rgba(240,199,120,0),0 3px 7px rgba(0,0,0,.45)}}
.hb-chip{position:absolute;left:0;top:0;width:40px;height:40px;border-radius:50%;pointer-events:none;
  background:radial-gradient(circle at 38% 30%,#f7edd0,#e6d4aa 68%,#cdb98d);
  border:1px solid rgba(60,40,16,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:"Iowan Old Style",Palatino,Georgia,serif;line-height:1;transform-origin:50% 50%;
  box-shadow:0 3px 7px rgba(0,0,0,.45);transition:opacity .2s,filter .3s;will-change:transform}
.hb-chip b{font-size:19px;font-weight:700;letter-spacing:-.02em}
.hb-chip i{display:flex;gap:2px;margin-top:3px}
.hb-chip i span{width:3px;height:3px;border-radius:50%;background:currentColor;display:block}
.hb-chip.hot{animation:hb-pop 1.1s ease-out}
.hb-robber{filter:saturate(.35) brightness(.55)}
.hb-port{position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;padding:3px 7px 4px;border-radius:8px;background:rgba(8,16,25,.88);border:1px solid rgba(154,190,225,.3);transform-origin:50% 50%;box-shadow:0 2px 6px rgba(0,0,0,.5);line-height:1;pointer-events:auto;cursor:default;transition:background .15s,border-color .15s;will-change:transform}
.hb-port b{font-family:"Iowan Old Style",Palatino,Georgia,serif;font-size:13px;color:#e0b15e;font-weight:700}
.hb-port em{font-size:7.5px;font-style:normal;letter-spacing:.08em;color:#b9c6d4;margin-top:2px;font-weight:600}
.hb-port i{width:18px;height:3px;border-radius:2px;margin-top:3px}
.hb-port.hovered{border-color:#e0b15e;background:rgba(12,22,34,.97);box-shadow:0 5px 14px rgba(0,0,0,.6)}
`;

const OCEAN_VS = `uniform float uScale; varying vec2 vP; void main(){ vP = position.xy * uScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const OCEAN_FS = `
uniform float uTime, uInner, uOuter; uniform vec3 uShallow, uDeep;
varying vec2 vP;
void main(){
  float r = length(vP);
  vec3 col = mix(uShallow, uDeep, smoothstep(uInner * 0.95, uInner * 1.7, r));
  // calm swell: a faint, slow brightness drift — no glitter (motion belongs to the land)
  float sw = sin(vP.x * 2.1 + uTime * 0.18 + sin(vP.y * 0.9 + uTime * 0.07) * 1.6) * sin(vP.y * 1.7 - uTime * 0.15);
  col *= 1.0 + sw * 0.05 * (1.0 - smoothstep(uInner, uInner * 2.2, r));
  float a = 1.0 - smoothstep(uInner * 1.15, uInner * 3.2, r);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
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

    // camera: targets (what input/fit asks for) and the eased values actually rendered
    this._az = 0; this._po = PO_DEFAULT; this._rad = 6;
    this._cRad = 6; this._vAz = 0; this._vPo = 0;
    this._ins = { top: 0, right: 0, bottom: 0, left: 0 };
    this._off = { x: 0, y: 0 }; this._cOff = { x: 0, y: 0 };
    this._fitR = 2.6; this._worldR = 2.9;
    this._portChips = [];
    this._target = new THREE.Vector3(0, 0.05, 0);
    this._chips = [];
    this._life = { eagles: [], wings: [], flocks: [], canopies: [], boats: [], choppers: [], grass: [] };
    this._pieceMap = new Map();
    this._anims = [];
    this._hexPick = null;

    this._scene = new THREE.Scene();
    this._scene.background = null;
    // sky/ground bounce + a warm key light + a cool rim so the low-poly facets read
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    this._scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x4a3a26, 0.95));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.35);
    sun.position.set(4, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.015;
    sun.shadow.radius = 3;
    Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 30 });
    this._sun = sun;
    this._scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7fb2ff, 0.55);
    rim.position.set(-5, 3.5, -6);
    this._scene.add(rim);

    this._camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this._fitCam = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, antialias: true, alpha: true });
    this._renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this._buildOcean();
    this._bindInput();
    this._resize();
    this._t0 = this._last = performance.now();
    this._renderer.setAnimationLoop(() => this._frame());

    window.__hexBoard = this;
    document.dispatchEvent(new CustomEvent('hex-board-ready', { detail: this }));
  }

  disconnectedCallback() {
    this._renderer?.setAnimationLoop(null);
    this._renderer?.dispose();
  }

  // ---------------- input: orbit (with inertia), pinch/wheel zoom, tap ----------------
  _bindInput() {
    const el = this._canvas;
    const pts = new Map();               // active pointers by id
    let lastDist = 0, downAt = null, moved = 0, lastMoveT = 0;
    const twoDist = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    const down = e => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      el.style.cursor = 'grabbing';
      this._dragging = true; this._vAz = 0; this._vPo = 0; this._azGoal = this._poGoal = null;
      if (pts.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = 0; }
      if (pts.size === 2) { lastDist = twoDist(); downAt = null; }
    };
    const move = e => {
      const p = pts.get(e.pointerId);
      if (!p) { if (e.pointerType === 'mouse') this._hover(e); return; }
      if (pts.size === 2) {                       // exactly two fingers -> pinch zoom
        p.x = e.clientX; p.y = e.clientY;
        const d = twoDist();
        if (lastDist && d) this._zoomBy(lastDist / d);
        lastDist = d;
      } else if (pts.size === 1) {                // one finger -> orbit / look around
        const dx = e.clientX - p.x, dy = e.clientY - p.y;
        const now = performance.now(), dt = Math.max(8, now - (lastMoveT || now - 16));
        lastMoveT = now;
        moved += Math.abs(dx) + Math.abs(dy);
        const dAz = -dx * 0.006, dPo = -dy * 0.005;
        this._az += dAz;
        this._po = Math.min(PO_MAX, Math.max(PO_MIN, this._po + dPo));
        // remember a smoothed release velocity (radians per ms) for the glide
        this._vAz = this._vAz * 0.5 + (dAz / dt) * 0.5;
        this._vPo = this._vPo * 0.5 + (dPo / dt) * 0.5;
        p.x = e.clientX; p.y = e.clientY;
      } else { p.x = e.clientX; p.y = e.clientY; } // 3+ fingers: track only, never zoom
    };
    const up = e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      try { el.releasePointerCapture(e.pointerId); } catch (_) {}
      if (pts.size < 2) lastDist = 0;
      if (!pts.size) {
        el.style.cursor = 'grab';
        this._dragging = false;
        // a stale velocity (finger rested before lifting) should not fling the board
        if (performance.now() - lastMoveT > 90) { this._vAz = 0; this._vPo = 0; }
        if (downAt && moved < 8 && performance.now() - downAt.t < 450 && e.type === 'pointerup') this._tap(e);
        downAt = null;
      }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', () => this._setHoverHex(null));
    // release/cancel listened on window: a finger lifted off the canvas still clears,
    // so a stale pointer can never wedge the gesture into permanent pinch-zoom mode
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
    el.addEventListener('wheel', e => { e.preventDefault(); this._zoomBy(1 + Math.max(-60, Math.min(60, e.deltaY)) * 0.0016); }, { passive: false });
    el.addEventListener('dblclick', () => this.resetView());
  }

  _zoomBy(f) {
    this._userZoom = true;
    this._rad = Math.min(this._maxOut(), Math.max(MINR, this._rad * f));
  }

  /** Recentre: glide back to the default angle and the fitted distance. */
  resetView() {
    this._vAz = this._vPo = 0; this._userZoom = false;
    this._azGoal = Math.round(this._az / (Math.PI * 2)) * Math.PI * 2;
    this._poGoal = PO_DEFAULT;
    this._fit();
  }

  /** Slow idle orbit (radians/second) — the menu lets the island turn on its own. */
  setSpin(rate) { this._spin = rate || 0; }

  /** Legacy: reserve horizontal/vertical room and bias the island sideways. */
  setPanels(x, y, shift) {
    const ix = x || 0, iy = y || 0, s = shift || 0;
    this.setInsets({ left: Math.max(0, ix / 2 - s), right: Math.max(0, ix / 2 + s), top: iy * 0.42, bottom: iy * 0.58 });
  }

  /** Reserve screen space (px) taken by floating chrome; the island frames itself,
   *  centred, in what is left. Eases there rather than jumping. */
  setInsets(ins, opts) {
    this._ins = { top: ins.top || 0, right: ins.right || 0, bottom: ins.bottom || 0, left: ins.left || 0 };
    // exact: fit the island's real outline at the default angle (tighter, bigger island);
    // otherwise a bounding circle, which stays framed while the island spins
    this._exact = !!(opts && opts.exact);
    this._userZoom = false;
    this._resize();
  }

  _maxOut() { return Math.max(8, this._fitDistance({ top: 0, right: 0, bottom: 0, left: 0 }, this._worldR) * 1.7); }

  /** Pose a camera for the given orbit + distance + view offset. */
  _pose(cam, az, po, rad, ox, oy) {
    cam.position.set(this._target.x + rad * Math.sin(po) * Math.sin(az), this._target.y + rad * Math.cos(po), this._target.z + rad * Math.sin(po) * Math.cos(az));
    cam.lookAt(this._target);
    // the view offset slides the image so the island centres in the free region
    // without tilting the horizon
    cam.setViewOffset(this._w, this._h, ox, oy, this._w, this._h);
    cam.updateMatrixWorld();
  }

  /** Smallest distance at which the island — a circle of radius r, or a list of world
   *  points — fits the free rect. */
  _fitDistance(ins, shape) {
    const w = this._w || 1, h = this._h || 1;
    const L = ins.left, Rr = w - ins.right, T = ins.top, B = h - ins.bottom;
    const cx = (L + Rr) / 2, cy = (T + B) / 2;
    const ox = w / 2 - cx, oy = h / 2 - cy;
    const cam = this._fitCam;
    cam.fov = this._camera.fov; cam.aspect = w / h; cam.updateProjectionMatrix();
    const pad = Math.min(w, h) * 0.02 + 6;
    let pts = shape;
    if (!Array.isArray(shape)) {
      pts = [];
      for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * shape, 0.05, Math.sin(a) * shape)); }
    }
    const v = new THREE.Vector3();
    const fits = d => {
      this._pose(cam, 0, this._po, d, ox, oy);
      for (const p of pts) {
        v.copy(p).project(cam);
        if (v.z > 1) return false;
        const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
        if (sx < L + pad || sx > Rr - pad || sy < T + pad || sy > B - pad) return false;
      }
      return true;
    };
    let lo = MINR, hi = 80;
    for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (fits(m)) hi = m; else lo = m; }
    return { d: hi, ox, oy };
  }

  _fit() {
    const f = this._fitDistance(this._ins, this._exact && this._fitPts && this._fitPts.length ? this._fitPts : this._fitR);
    this._off = { x: f.ox, y: f.oy };
    if (this._userZoom) return;
    this._rad = Math.max(MINR, f.d);
  }

  _resize() {
    const w = this.clientWidth || 1, h = this.clientHeight || 1;
    const first = !this._w;
    this._w = w; this._h = h;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h, false);
    this._fit();
    if (first) { this._cRad = this._rad; this._cOff = { ...this._off }; }
  }

  // ---------------- board construction from engine state ----------------
  /** Full rebuild: terrain, water, harbours, tokens, then pieces. */
  setState(S) {
    this._S = S;
    if (this._terrain) { this._scene.remove(this._terrain); this._dispose(this._terrain); }
    for (const k in this._life) this._life[k].length = 0;
    this._overlay.textContent = '';
    this._chips = [];
    this._portChips = [];
    this._spins = {};
    this._terrain = new THREE.Group();
    this._buildTerrain();
    this._scene.add(this._terrain);
    this._clearPieces();
    this._syncPieces(false);
    this._clearHexPick();
    this._fit();
  }

  /** Cheap update after a move — only pieces that changed are touched (and animate in). */
  refresh() { if (this._S) this._syncPieces(true); }

  _dispose(g) {
    const mats = new Set();
    g.traverse(o => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m));
    });
    mats.forEach(m => m.dispose());
  }

  _buildOcean() {
    this._oceanMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uScale: { value: 15 }, uInner: { value: 3 }, uOuter: { value: 15 },
        uShallow: { value: new THREE.Color(0x1a5070) }, uDeep: { value: new THREE.Color(0x0b1a2a) } },
      vertexShader: OCEAN_VS, fragmentShader: OCEAN_FS,
    });
    const sea = new THREE.Mesh(new THREE.CircleGeometry(1, 96), this._oceanMat);   // unit disc, scaled in the shader
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = 0.045;
    sea.renderOrder = -1;
    this._ocean = sea;
    this._scene.add(sea);
  }

  _buildTerrain() {
    const S = this._S;
    // terrain — one tile per engine hex, each spun to a random orientation
    const spins = this._spins;
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
    const RR = S.board.hexes.reduce((m, h) => Math.max(m, (Math.abs(h.q) + Math.abs(h.r) + Math.abs(h.q + h.r)) / 2), 0);
    const WR = RR + 1;
    // radii: the land (what the camera fits) and the whole ring (zoom-out limit, ocean)
    let landR = 0;
    this._fitPts = [];
    for (const h of S.board.hexes) {
      const [x, z] = toWorld(h.x, h.y);
      landR = Math.max(landR, Math.hypot(x, z) + HEX_W);
      for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); this._fitPts.push(new THREE.Vector3(x + HEX_W * Math.cos(a), TOPY, z + HEX_W * Math.sin(a))); }
    }
    let mr = 0;
    for (const [q, r] of [[WR, 0], [0, WR], [-WR, WR], [-WR, 0], [0, -WR], [WR, -WR]]) {
      const [wx, wz] = toWorld(HEX_SIZE * Math.sqrt(3) * (q + r / 2), HEX_SIZE * 1.5 * r);
      mr = Math.max(mr, Math.hypot(wx, wz));
    }
    this._worldR = mr + 0.55;
    this._fitR = landR + HEX_W * 0.55;   // land plus the harbour docks; the outer water may crop
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
      this._addPortChip(port.type, x + ux / len * 0.28, z + uz / len * 0.28);
      this._fitPts.push(new THREE.Vector3(x + ux / len * 0.12, 0.18, z + uz / len * 0.12));   // keep harbour labels in frame
    }
    // ocean + shadow frustum follow the map size
    const U = this._oceanMat.uniforms;
    this._ocean.scale.setScalar(mr * 5);
    U.uScale.value = U.uOuter.value = mr * 5;
    U.uInner.value = mr;
    const e = this._worldR + 0.3;
    Object.assign(this._sun.shadow.camera, { left: -e, right: e, top: e, bottom: -e });
    this._sun.shadow.camera.updateProjectionMatrix();
  }

  _addTile(kind, x, z, ry) {
    const tile = EXPANSION_KINDS.includes(kind)
      ? buildExpansionTile(THREE, kind, { noToken: true })
      : buildTile(THREE, kind, { noToken: true });
    tile.position.set(x, 0, z);
    tile.rotation.y = ry;
    // translucent props (smoke, mist, glints) opt out of casting — a puff must not
    // drop a hard blob on the next hex
    tile.traverse(o => {
      if (!o.isMesh) return;
      if (!o.userData.noShadow) o.castShadow = true;
      o.receiveShadow = true;
      // the water ring: a touch deeper and glossier so it melts into the open sea
      if (o.material && o.material.name === 'water') { o.material.color.setHex(0x2a6f9c); o.material.roughness = 0.3; }
    });
    this._registerLife(tile);
    registerExpansionLife(THREE, tile, this._life);
    this._terrain.add(tile);
  }

  // ---------------- pieces: diffed, animated ----------------
  _clearPieces() {
    for (const o of this._pieceMap.values()) { this._scene.remove(o.obj); this._dispose(o.obj); }
    this._pieceMap.clear();
  }

  /** Desired pieces from engine state, keyed so a rebuild only touches what changed. */
  _wantedPieces() {
    const S = this._S, out = new Map();
    for (const v of Object.values(S.board.V)) {
      if (!v.bld) continue;
      const [x, z] = toWorld(v.x, v.y);
      const kind = v.bld.type === 'city' ? 'city' : 'settlement';
      out.set('v:' + v.k, { sig: kind + v.bld.p, kind, p: v.bld.p, x, z, ry: Math.atan2(x, z) });
    }
    for (const e of Object.values(S.board.E)) {
      for (const field of ['road', 'ship']) {
        if (e[field] === null || e[field] === undefined) continue;
        const a = S.board.V[e.a], b = S.board.V[e.b];
        const [ax, az] = toWorld(a.x, a.y), [bx, bz] = toWorld(b.x, b.y);
        out.set(field[0] + ':' + e.k, { sig: field + e[field], kind: field, p: e[field], x: (ax + bx) / 2, z: (az + bz) / 2, ry: Math.atan2(-(bz - az), bx - ax) });
      }
    }
    const rh = S.board.hexes[S.board.robber];
    if (rh) { const [x, z] = toWorld(rh.x, rh.y); out.set('robber', { sig: 'robber', kind: 'robber', hex: rh.id, x: x - 0.16, z: z - 0.24, ry: 0.5 }); }
    return out;
  }

  _makePiece(w) {
    const S = this._S;
    let obj;
    if (w.kind === 'ship') obj = buildExpansionPiece(THREE, 'ship', { color: neon(S.players[w.p].color) });
    else if (w.kind === 'robber') obj = buildPiece(THREE, 'robber', { color: ROBBER_COLOR, scale: PIECE_SCALE.robber });
    else obj = buildPiece(THREE, w.kind, { color: neon(S.players[w.p].color), scale: PIECE_SCALE[w.kind] });
    obj.position.set(w.x, TOPY, w.z);
    obj.rotation.y = w.ry;
    obj.traverse(o => { if (o.isMesh && !o.name.endsWith('_glow')) { o.castShadow = true; o.receiveShadow = true; } });
    return obj;
  }

  _syncPieces(animate) {
    const want = this._wantedPieces();
    const have = this._pieceMap;
    const fresh = [];
    for (const [k, cur] of [...have]) {
      const w = want.get(k);
      if (k === 'robber' && w) {
        if (cur.hex !== w.hex) {          // hop the robber across rather than teleporting
          const from = cur.obj.position.clone(), to = new THREE.Vector3(w.x, TOPY, w.z);
          cur.hex = w.hex;
          if (animate) this._animate(650, k2 => {
            const e = ease.inOut(k2);
            cur.obj.position.lerpVectors(from, to, e);
            cur.obj.position.y = TOPY + Math.sin(Math.PI * e) * 0.55;
            cur.obj.rotation.y = w.ry + Math.sin(Math.PI * e) * 0.8;
          }, () => { this._ripple(w.x + 0.16, w.z + 0.24, 0x9aa3c0, 0.4); });
          else cur.obj.position.copy(to);
        }
        continue;
      }
      if (!w || w.sig !== cur.sig) { this._scene.remove(cur.obj); this._dispose(cur.obj); have.delete(k); }
    }
    for (const [k, w] of want) {
      if (have.has(k)) continue;
      const obj = this._makePiece(w);
      this._scene.add(obj);
      have.set(k, { obj, sig: w.sig, hex: w.hex });
      if (animate && k !== 'robber') fresh.push({ obj, w });
    }
    fresh.forEach(({ obj, w }, i) => this._dropIn(obj, w, i * 90));
    this._markRobberChip();
  }

  _dropIn(obj, w, delay) {
    const s1 = obj.scale.x, y1 = obj.position.y;
    obj.scale.setScalar(0.0001);
    const col = w.p != null ? neon(this._S.players[w.p].color) : 0xffffff;
    this._animate(520, k => {
      const e = ease.outBack(k);
      obj.scale.setScalar(Math.max(0.0001, s1 * Math.min(1.15, 0.25 + 0.75 * e)));
      obj.position.y = y1 + (1 - ease.outCubic(k)) * 0.5;
    }, () => { obj.scale.setScalar(s1); obj.position.y = y1; this._ripple(w.x, w.z, col, w.kind === 'road' || w.kind === 'ship' ? 0.24 : 0.3); }, delay);
  }

  /** An expanding glow ring on the ground — draws the eye to where something happened. */
  _ripple(x, z, color, size) {
    const geo = new THREE.RingGeometry(0.8, 1, 40);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, TOPY + 0.012, z);
    this._scene.add(m);
    this._animate(900, k => {
      const e = ease.outCubic(k);
      m.scale.setScalar(size * (0.25 + e * 0.75));
      mat.opacity = 0.6 * (1 - k) * (1 - k);
    }, () => { this._scene.remove(m); geo.dispose(); mat.dispose(); });
  }

  _animate(dur, step, done, delay = 0) {
    this._anims.push({ t0: performance.now() + delay, dur, step, done });
  }
  _stepAnims(now) {
    if (!this._anims.length) return;
    const keep = [];
    for (const a of this._anims) {
      if (now < a.t0) { keep.push(a); continue; }
      const k = Math.min(1, (now - a.t0) / a.dur);
      a.step(k);
      if (k < 1) keep.push(a); else a.done && a.done();
    }
    this._anims = keep;
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

  // ---------------- number tokens as projected DOM chips ----------------
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

  /** Flash the tokens — and the tiles — that just paid out. */
  pulse(total) {
    if (!this._S) return;
    for (const c of this._chips) {
      const h = this._S.board.hexes[c.hex];
      if (h.num !== total) continue;
      c.el.classList.remove('hot');
      void c.el.offsetWidth;
      c.el.classList.add('hot');
      if (h.id === this._S.board.robber) continue;
      const [x, z] = toWorld(h.x, h.y);
      const geo = new THREE.CircleGeometry(HEX_W * 0.97, 6, Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({ color: 0xf0c778, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, TOPY + 0.02, z);
      this._scene.add(m);
      this._animate(1300, k => { mat.opacity = Math.sin(Math.PI * Math.min(1, k * 1.4)) * 0.32; },
        () => { this._scene.remove(m); geo.dispose(); mat.dispose(); });
    }
  }

  _addPortChip(type, x, z) {
    const el = document.createElement('div');
    el.className = 'hb-port';
    const ratio = type === 'any' ? '3:1' : '2:1';
    el.innerHTML = `<b>${ratio}</b><em>${PORT_LABEL[type] || 'ANY'}</em><i style="background:${PORT_COL[type] || '#5b7089'}"></i>`;
    this._overlay.appendChild(el);
    const chip = { el, pos: new THREE.Vector3(x, 0.18, z), hover: false, hs: 1 };
    el.addEventListener('pointerenter', () => { chip.hover = true; });
    el.addEventListener('pointerleave', () => { chip.hover = false; });
    this._portChips.push(chip);
  }

  /** On-screen size (px) of one hex at the current zoom — drives overlay sizing. */
  _hexPx() {
    const vf = Math.tan((this._camera.fov * Math.PI / 180) / 2);
    return HEX_W * 2 * this._h / (2 * vf * this._cRad);
  }

  _syncChips() {
    const hp = this._hexPx();
    const scale = Math.min(1.12, Math.max(0.42, hp * 0.34 / 40));
    const pScale = Math.min(1.1, Math.max(0.5, hp * 0.4 / 46));
    const v = new THREE.Vector3();
    for (const c of this._portChips) {
      v.copy(c.pos).project(this._camera);
      const x = (v.x * 0.5 + 0.5) * this._w, y = (-v.y * 0.5 + 0.5) * this._h;
      const target = c.hover ? 2 : pScale;
      c.hs += (target - c.hs) * 0.25;                      // ease the hover grow/shrink
      c.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${c.hs})`;
      c.el.style.opacity = v.z > 1 ? '0' : '1';
      c.el.style.zIndex = c.hover ? '5' : '';
      c.el.classList.toggle('hovered', c.hover);
    }
    for (const c of this._chips) {
      v.copy(c.pos).project(this._camera);
      const x = (v.x * 0.5 + 0.5) * this._w, y = (-v.y * 0.5 + 0.5) * this._h;
      c.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;
      c.el.style.opacity = v.z > 1 ? '0' : '1';
    }
  }

  /** World → screen px (relative to the board element). */
  toScreen(wx, wy, wz) {
    const v = new THREE.Vector3(wx, wy ?? TOPY, wz).project(this._camera);
    return { x: (v.x * 0.5 + 0.5) * this._w, y: (-v.y * 0.5 + 0.5) * this._h, visible: v.z <= 1 };
  }
  /** Screen position of an engine hex (by id). */
  hexScreen(hid) {
    const h = this._S?.board.hexes[hid];
    if (!h) return null;
    const [x, z] = toWorld(h.x, h.y);
    return this.toScreen(x, 0.12, z);
  }

  // ---------------- placement picking ----------------
  // vertices/edges: projected DOM markers; hexes: 3D highlight + tap anywhere on the
  // tile (plus a small DOM target so it also works by keyboard / scripted click)
  setPick(list, onPick) {
    this._onPick = onPick || null;
    if (!this._pickLayer) {
      this._pickLayer = document.createElement("div");
      this._pickLayer.style.cssText = "position:absolute;inset:0;pointer-events:none";
      this.appendChild(this._pickLayer);
    }
    this._pickLayer.textContent = "";
    this._pickEls = [];
    const hexes = [];
    for (const t of (list || [])) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "hb-pick hb-pick-" + (t.cls || "v");
      b.style.pointerEvents = "auto";
      if (t.label != null) { b.dataset.label = t.label; b.innerHTML = `<span>${t.label}</span>`; }
      if (t.title) { b.title = t.title; b.setAttribute('aria-label', t.title); }
      const key = t.key;
      b.addEventListener("pointerdown", ev => ev.stopPropagation());
      b.addEventListener("click", ev => { ev.stopPropagation(); this._onPick && this._onPick(key); });
      if (t.cls === 'h') {
        b.addEventListener('pointerenter', () => this._setHoverHex(key));
        b.addEventListener('pointerleave', () => this._setHoverHex(null));
        hexes.push(key);
      }
      this._pickLayer.appendChild(b);
      this._pickEls.push({ el: b, key, pos: new THREE.Vector3(t.wx, t.wy == null ? TOPY : t.wy, t.wz) });
    }
    this._setHexPick(hexes);
    this._syncPick();
  }
  clearPick() { if (this._pickLayer) this._pickLayer.textContent = ""; this._pickEls = []; this._onPick = null; this._clearHexPick(); }

  _syncPick() {
    const els = this._pickEls;
    if (!els || !els.length) return;
    const hp = this._hexPx();
    const s = Math.min(1.15, Math.max(0.7, hp / 110));
    const v = new THREE.Vector3();
    for (const p of els) {
      v.copy(p.pos).project(this._camera);
      const vis = v.z <= 1;
      p.el.style.display = vis ? "block" : "none";
      if (!vis) continue;
      const x = (v.x * 0.5 + 0.5) * this._w, y = (-v.y * 0.5 + 0.5) * this._h;
      p.el.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${s})`;
    }
  }

  _clearHexPick() {
    if (!this._hexPick) return;
    this._scene.remove(this._hexPick.group);
    this._dispose(this._hexPick.group);
    this._hexPick = null;
  }
  _setHexPick(ids) {
    this._clearHexPick();
    if (!ids.length || !this._S) return;
    const group = new THREE.Group();
    const items = new Map();
    for (const id of ids) {
      const h = this._S.board.hexes[id];
      const [x, z] = toWorld(h.x, h.y);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xff7a68, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.RingGeometry(HEX_W * 0.86, HEX_W * 0.96, 6, 1, Math.PI / 2), ringMat);
      const fillMat = new THREE.MeshBasicMaterial({ color: 0xff5a48, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const fill = new THREE.Mesh(new THREE.CircleGeometry(HEX_W * 0.94, 6, Math.PI / 2), fillMat);
      for (const m of [ring, fill]) { m.rotation.x = -Math.PI / 2; m.position.set(x, TOPY + 0.03, z); group.add(m); }
      items.set(id, { ringMat, fillMat, x, z });
    }
    this._scene.add(group);
    this._hexPick = { group, items, hover: null };
  }
  _setHoverHex(id) { if (this._hexPick) this._hexPick.hover = (id != null && this._hexPick.items.has(id)) ? id : null; }

  /** Engine hex under a screen point (ray → ground plane → nearest centre). */
  _hexAt(clientX, clientY) {
    if (!this._S) return null;
    const r = this._canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this._camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOPY), hit)) return null;
    let best = null, bd = Infinity;
    for (const h of this._S.board.hexes) {
      const [x, z] = toWorld(h.x, h.y);
      const d = Math.hypot(hit.x - x, hit.z - z);
      if (d < bd) { bd = d; best = h.id; }
    }
    return bd < HEX_W * 0.92 ? best : null;
  }
  _hover(e) {
    if (!this._hexPick) return;
    this._setHoverHex(this._hexAt(e.clientX, e.clientY));
    this._canvas.style.cursor = this._hexPick.hover != null ? 'pointer' : 'grab';
  }
  _tap(e) {
    if (!this._hexPick || !this._onPick) return;
    const id = this._hexAt(e.clientX, e.clientY);
    if (id != null && this._hexPick.items.has(id)) this._onPick(id);
  }
  _stepHexPick(t) {
    if (!this._hexPick) return;
    const pulse = 0.38 + 0.22 * Math.sin(t * 2.4);
    for (const [id, it] of this._hexPick.items) {
      const on = this._hexPick.hover === id;
      it.ringMat.opacity = on ? 0.95 : pulse;
      it.fillMat.opacity += ((on ? 0.28 : 0) - it.fillMat.opacity) * 0.25;
    }
  }

  // ---------------- living details (same treatment as the standalone board demo) ----------------
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
    const now = performance.now();
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    const t = ((now - this._t0) / 1000) * 2.6;
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
    this._oceanMat.uniforms.uTime.value = t;
    this._stepAnims(now);
    this._stepHexPick(t);

    // orbit glide after a flick, then ease distance + framing toward their targets
    if (!this._dragging && (this._vAz || this._vPo)) {
      this._az += this._vAz * dt * 1000;
      this._po = Math.min(PO_MAX, Math.max(PO_MIN, this._po + this._vPo * dt * 1000));
      const decay = Math.exp(-dt * 4.5);
      this._vAz *= decay; this._vPo *= decay;
      if (Math.abs(this._vAz) < 1e-5 && Math.abs(this._vPo) < 1e-5) this._vAz = this._vPo = 0;
    }
    if (!this._dragging && this._spin) this._az += this._spin * dt;
    const k = 1 - Math.exp(-dt * 7);
    if (this._azGoal != null) {
      this._az += (this._azGoal - this._az) * k;
      if (Math.abs(this._azGoal - this._az) < 1e-3) { this._az = this._azGoal; this._azGoal = null; }
    }
    if (this._poGoal != null) {
      this._po += (this._poGoal - this._po) * k;
      if (Math.abs(this._poGoal - this._po) < 1e-3) { this._po = this._poGoal; this._poGoal = null; }
    }
    this._cRad += (this._rad - this._cRad) * k;
    this._cOff.x += (this._off.x - this._cOff.x) * k;
    this._cOff.y += (this._off.y - this._cOff.y) * k;
    this._pose(this._camera, this._az, this._po, this._cRad, this._cOff.x, this._cOff.y);
    this._renderer.render(this._scene, this._camera);
    this._syncChips();
    this._syncPick();
  }
}

customElements.define('hex-board', HexBoard);
