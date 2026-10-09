/* ================= HEXHAVEN UI ================= */
'use strict';

const $=id=>document.getElementById(id);
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
// assign innerHTML only when it changed, so running CSS animations aren't restarted
const setHTML=(e,html)=>{ if(e&&e._h!==html){ e.innerHTML=html; e._h=html; } };

/* crisp inline icon set — no emoji, consistent on every platform */
const ICONS={
  card:'<rect x="-8" y="-9" width="12" height="16" rx="2"/><rect x="-3" y="-7" width="12" height="16" rx="2"/>',
  scroll:'<path d="M-8 -8 h13 a3 3 0 0 1 3 3 v10 a3 3 0 0 1 -3 3 h-13 a3 3 0 0 1 -3 -3 v-10 a3 3 0 0 1 3 -3 z"/><path d="M-5 -3 h9 M-5 1 h9 M-5 5 h6"/>',
  sword:'<path d="M-7 7 L5 -5 M5 -5 L8 -8 M-2 2 L-6 -2 M2 -2 L6 2 M-7 7 L-9 9"/>',
  road:'<path d="M-8 8 L8 -8"/><path d="M-3 -2 L1 2" stroke-dasharray="2 3"/>',
  house:'<path d="M-7 8 V-1 L0 -8 L7 -1 V8 Z"/>',
  city:'<path d="M-9 8 V-2 L-4 -8 L1 -2 V0 H9 V8 Z"/>',
  die:'<rect x="-9" y="-9" width="18" height="18" rx="4"/><circle cx="-4" cy="-4" r="1.6" fill="currentColor" stroke="none"/><circle cx="4" cy="4" r="1.6" fill="currentColor" stroke="none"/><circle cx="0" cy="0" r="1.6" fill="currentColor" stroke="none"/>',
  gift:'<rect x="-8" y="-3" width="16" height="11" rx="1.5"/><path d="M0 -3 V8 M-8 -3 H8 M0 -3 C -6 -3 -6 -9 -2 -8 C 1 -7 0 -4 0 -3 C 0 -4 -1 -7 2 -8 C 6 -9 6 -3 0 -3"/>',
  gear:'<circle cx="0" cy="0" r="3.4"/><path d="M0 -9 V-6 M0 6 V9 M-9 0 H-6 M6 0 H9 M-6.4 -6.4 L-4.2 -4.2 M4.2 4.2 L6.4 6.4 M-6.4 6.4 L-4.2 4.2 M4.2 -4.2 L6.4 -6.4"/>',
  menu:'<path d="M-8 -5 H8 M-8 0 H8 M-8 5 H8"/>',
  ship:'<path d="M-8 4 L8 4 L5 9 L-5 9 Z"/><path d="M0 4 L0 -8 L6 -1 L0 0"/>',
  coins:'<circle cx="-3" cy="-3" r="5.5"/><path d="M2 -1 a5.5 5.5 0 1 1 -7 7"/>',
  rosette:'<circle cx="0" cy="0" r="5"/><path d="M0 -5 V-9 M0 5 V9 M-5 0 H-9 M5 0 H9 M-3.5 -3.5 L-6.4 -6.4 M3.5 3.5 L6.4 6.4 M-3.5 3.5 L-6.4 6.4 M3.5 -3.5 L6.4 -6.4"/>',
  flag:'<path d="M-6 9 V-9 M-6 -8 H7 L3 -4 L7 0 H-6"/>',
};
const icoGeo=(name,size)=>`<svg class="ig" width="${size}" height="${size}" viewBox="-12 -12 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
/* rich silhouettes from game-icons.net (see GI), geometric fallback for micro/chrome icons */
const gico=(name,size=16)=>`<svg class="ig" width="${size}" height="${size}" viewBox="0 0 512 512" aria-hidden="true">${GI[name].map(d=>`<path d="${d}" fill="currentColor"/>`).join('')}</svg>`;
const ico=(name,size=15)=> (size>=13&&GI[name]) ? gico(name,size) : icoGeo(name,size);
const DEV_ICO={knight:'sword',vp:'rosette',road:'road',plenty:'gift',mono:'coins'};
const resIconHTML=(r,size=22)=>gico(r,size);
// a resource as a small coloured tile with a white silhouette
const resChip=(r,size=26,icon=16)=>`<span class="resico" style="background:${RES_META[r].col};width:${size}px;height:${size}px">${gico(r,icon)}</span>`;
const SAVE_KEY='hexhaven-save-v1', SET_KEY='hexhaven-settings-v1';
const WIDE_Q='(min-width:1100px) and (min-height:600px)';

const DEFAULT_SETTINGS={
  name:'You', colorIdx:0, bots:3, difficulty:'standard', target:10,
  layout:'spiral', friendlyRobber:false, botTrades:true, speed:'normal',
  expWild:false, mapSize:2, expSea:false,
};
let settings=loadSettings();
// Expansions are dev-only for now — visible in setup only with ?dev in the URL.
const DEV = /(?:\?|&)dev\b/.test(location.search);
let S=null;            // game state
let mode=null;         // board interaction mode
let botTimer=null;
let busy=false;        // a roll is tumbling — hold input until it lands
let diceHidden=false;  // keep the result out of the banner until the dice settle
let gameId=0;          // bumps on every new/resumed game so stale callbacks bail out

function loadSettings(){
  try{ return {...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SET_KEY)||'{}')}; }
  catch(e){ return {...DEFAULT_SETTINGS}; }
}
function saveSettings(){ try{localStorage.setItem(SET_KEY,JSON.stringify(settings));}catch(e){} }
function saveGame(){ try{ if(S&&S.phase!=='over') localStorage.setItem(SAVE_KEY,JSON.stringify(S)); else localStorage.removeItem(SAVE_KEY);}catch(e){} }
function hasSave(){ try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;} }

const SPEEDS={relaxed:900,normal:520,fast:220};
const tick=()=>SPEEDS[S?.settings?.speed||settings.speed]||520;

/* timers that belong to a game — cleared together when the game is left */
const timers=new Set();
function later(fn,ms){ const id=setTimeout(()=>{ timers.delete(id); fn(); },ms); timers.add(id); return id; }
function haltAll(){ stopBots(); for(const id of timers) clearTimeout(id); timers.clear(); busy=false; diceHidden=false; $('dicebox')?.classList.remove('show','settled'); }

/* ---------------- 3D board glue ---------------- */
const W_K=(0.5*1.02)/56;                 // engine px -> world units (matches hex-board)
const toWorld=(x,y)=>[x*W_K,y*W_K];
let board=null, pendingState=null;
let engineReady=false, boardReady=false, loadDone=false, panelsHidden=false;
let screen='loading';
let draft=null, fromMenuNew=true;
let lastLogLen=-1, idleTimer=null, lastInsets='';

function attachBoard(b){
  if(board===b) return;
  board=b; boardReady=true;
  if(pendingState){ board.setState(pendingState); pendingState=null; }
  setLoad('board');
}
document.addEventListener('hex-board-ready',e=>attachBoard(e.detail));

function boardNewIsland(st){ if(board) board.setState(st); else pendingState=st; }
function boardRefresh(){ if(board) board.refresh(); }

/* camera framing: the island centres itself in whatever the chrome leaves free */
function setInsets(ins,exact){
  if(!board) return;
  const key=JSON.stringify(ins)+exact;
  if(key===lastInsets) return;
  lastInsets=key;
  if(board.setInsets) board.setInsets(ins,{exact:!!exact}); else board.setPanels(ins.left+ins.right,ins.top+ins.bottom,0);
}
function menuInsets(){
  const w=innerWidth,h=innerHeight;
  if(w>820){
    const col=document.querySelector(screen==='setup'?'.setup-card':'.menu-col');
    const r=col?col.getBoundingClientRect():{right:420};
    return {left:Math.round(r.right+48),right:56,top:Math.round(h*0.1),bottom:Math.round(h*0.1)};
  }
  return {left:12,right:12,top:Math.round(h*0.14),bottom:Math.round(h*0.14)};
}
/** Measure the chrome, publish its size to CSS, and reframe the island around it. */
function syncChrome(){
  if(screen!=='game') return;
  const root=document.documentElement.style;
  const bar=$('dock').getBoundingClientRect(), top=$('g-header').getBoundingClientRect();
  const barH=Math.round(innerHeight-bar.top), topH=Math.round(top.bottom);
  root.setProperty('--bar-h',barH+'px');
  root.setProperty('--top-h',topH+'px');
  if(panelsHidden){ setInsets({top:12,bottom:12,left:12,right:12},true); return; }
  const wide=matchMedia(WIDE_Q).matches;
  const rv=$('opponents').getBoundingClientRect();
  setInsets({top:topH+6, bottom:barH+6, left:8, right: wide&&rv.width ? Math.round(innerWidth-rv.left+6) : 8},true);
}
function setDockCollapsed(on){ const d=$("dock"); if(!d)return; d.classList.toggle("collapsed",on); syncChrome(); }
function initDock(){
  const handle=$("dock-handle"); if(!handle) return;
  let sy=0,dy=0,active=false;
  handle.addEventListener("pointerdown",e=>{active=true;sy=e.clientY;dy=0;try{handle.setPointerCapture(e.pointerId);}catch(_){}});
  handle.addEventListener("pointermove",e=>{ if(active) dy=e.clientY-sy; });
  const end=()=>{ if(!active)return; active=false; if(dy>26) setDockCollapsed(true); else if(dy<-26) setDockCollapsed(false); else setDockCollapsed(!$("dock").classList.contains("collapsed")); };
  handle.addEventListener("pointerup",end); handle.addEventListener("pointercancel",end);
}

/* ---------------- screens ---------------- */
function show(name){
  screen=name;
  document.body.dataset.screen=name;
  if(board&&board.setSpin) board.setSpin(name==='game'?0:0.045);
  if(board&&board.resetView) board.resetView();   // every screen change starts from a framed island
  if(name==='menu'){ refreshMenu(); setInsets(menuInsets()); }
  else if(name==='setup') setInsets(menuInsets());
  else if(name==='game') requestAnimationFrame(syncChrome);
}

/* ---------------- loading ---------------- */
function setLoad(flag){
  if(flag==='engine') engineReady=true;
  if(flag==='board') boardReady=true;
  const bar=$('load-bar'), st=$('load-status');
  let pct=14, msg='Waking the engine';
  if(engineReady){ pct=58; msg='Raising the island'; }
  if(engineReady&&boardReady){ pct=100; msg='Ready'; }
  if(bar) bar.style.width=pct+'%';
  if(st) st.textContent=msg;
  if(engineReady&&boardReady&&!loadDone){
    loadDone=true;
    try{ boardNewIsland(newGame({...settings})); }catch(e){}
    setTimeout(()=>show('menu'),620);
  }
}

function boot(){
  document.body.dataset.screen='loading';
  $('btn-new').onclick=()=>showSetup(true);
  $('btn-continue').onclick=()=>{ try{ const st=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!st) return; haltAll(); S=st; boardNewIsland(S); startResume(); }catch(e){} };
  $('btn-settings').onclick=()=>showSetup(false);
  $('btn-rules').onclick=openRules;
  $('g-menu').onclick=(e)=>{ e.stopPropagation(); closePop('buildpop'); closePop('devpop'); togglePop('gamemenu'); };
  $('btn-tomenu').onclick=()=>{ closePops(); haltAll(); saveGame(); show('menu'); };
  $('btn-new-island').onclick=()=>{ closePops(); showSetup(true); };
  $('btn-rules-g').onclick=()=>{ closePops(); openRules(); };
  $('btn-hide').onclick=()=>{ closePops(); togglePanels(); };
  $('btn-recenter').onclick=()=>{ closePops(); board&&board.resetView&&board.resetView(); };
  $('btn-build').onclick=(e)=>{ e.stopPropagation(); toggleBuild(); };
  $('hint-cancel').onclick=()=>cancelMode();
  $('setup-back').onclick=()=>show('menu');
  $('log').onclick=()=>$('log').classList.toggle('open');
  // any tap on the island dismisses open popovers
  document.getElementById('board3d').addEventListener('pointerdown',()=>{ closePops(); $('log').classList.remove('open'); });
  if(window.__hexBoard) attachBoard(window.__hexBoard);
  initDock();
  initKeys();
  let rzT; window.addEventListener("resize",()=>{ clearTimeout(rzT); rzT=setTimeout(()=>{ if(screen==="game") syncChrome(); else if(screen==="menu"||screen==="setup") setInsets(menuInsets()); },120); });
  setLoad('engine');
}
function startResume(){
  gameId++;
  mode=null; lastLogLen=-1;
  panelsHidden=false; document.body.classList.remove('panels-hidden');
  show('game'); renderAll(); advance();
}
function refreshMenu(){ const has=hasSave(); $('btn-continue').disabled=!has; $('btn-continue').style.opacity=has?'1':'.4'; }

function togglePanels(){
  panelsHidden=!panelsHidden;
  document.body.classList.toggle('panels-hidden',panelsHidden);
  $('btn-hide').textContent=panelsHidden?'Show panels':'Focus mode';
  syncChrome();
}

/* lightweight popovers (game menu, build tray, dev cards) */
function closePop(id){ const p=$(id); if(p) p.hidden=true; if(id==='buildpop') $('btn-build').classList.remove('on'); }
function closePops(){ closePop('gamemenu'); closePop('buildpop'); closePop('devpop'); }
function togglePop(id){ const p=$(id); if(p) p.hidden=!p.hidden; }
function toggleBuild(){
  if(!S||screen!=='game') return;
  closePop('gamemenu'); closePop('devpop');
  togglePop('buildpop');
  $('btn-build').classList.toggle('on',!$('buildpop').hidden);
}
function toggleDev(){
  if(!S||screen!=='game') return;
  closePop('gamemenu'); closePop('buildpop');
  togglePop('devpop');
  renderDevPop();
}

/* ---------------- setup screen ---------------- */
function showSetup(fromNew){
  fromMenuNew=fromNew;
  draft={...settings};
  if(!DEV){ draft.expWild=false; draft.expSea=false; }   // expansions off for players
  $('setup-sub').textContent=fromNew?'Then deal yourself in.':'Applies to your next island.';
  $('setup-go').textContent=fromNew?'Start game':'Save and start';
  renderSetup();
  show('setup');
  reDeal();
}
function reDeal(){ try{ boardNewIsland(newGame({...draft})); }catch(e){} }
function renderSetup(){
  const s=draft;
  $('setup-body').innerHTML=`
    <div><div class="field-lab">Your name</div><input type="text" id="set-name" maxlength="14" value="${s.name.replace(/"/g,'&quot;')}"></div>
    <div><div class="field-lab">Your colour</div><div class="swatches" id="set-colors">${PLAYER_COLORS.map((c,i)=>`<button class="swatch ${i===s.colorIdx?'on':''}" data-i="${i}" style="background:${c.hex}" aria-label="${c.id}"></button>`).join('')}</div></div>
    <div><div class="field-lab">Rivals</div>${seg('bots',[{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}],s.bots)}</div>
    <div><div class="field-lab">Bot skill</div>${seg('difficulty',[{v:'casual',l:'Casual'},{v:'standard',l:'Standard'},{v:'cutthroat',l:'Cutthroat'}],s.difficulty)}</div>
    <div><div class="field-lab">Points to win</div>${seg('target',[{v:8,l:'8'},{v:10,l:'10'},{v:12,l:'12'}],s.target)}</div>
    <div><div class="field-lab">Map size<small>Standard 19 · Large 37 · Huge 61 hexes</small></div>${seg('mapSize',[{v:2,l:'Standard'},{v:3,l:'Large'},{v:4,l:'Huge'}],s.mapSize)}</div>
    <div><div class="field-lab">Island layout<small>Spiral is the classic numbering — no hot spots touching</small></div>${seg('layout',[{v:'spiral',l:'Spiral'},{v:'balanced',l:'Balanced'},{v:'random',l:'Chaos'}],s.layout)}</div>
    <div><div class="field-lab">Friendly robber<small>No stealing from players under 3 points</small></div>${seg('friendlyRobber',[{v:false,l:'Off'},{v:true,l:'On'}],s.friendlyRobber)}</div>
    <div><div class="field-lab">Bots may offer you trades</div>${seg('botTrades',[{v:false,l:'Off'},{v:true,l:'On'}],s.botTrades)}</div>
    <div><div class="field-lab">Bot pace</div>${seg('speed',[{v:'relaxed',l:'Relaxed'},{v:'normal',l:'Normal'},{v:'fast',l:'Fast'}],s.speed)}</div>
    ${DEV?`<div class="field-lab" style="color:var(--brass);letter-spacing:.1em;margin-top:6px">EXPANSIONS · DEV</div>
    <div><div class="field-lab">Wild &amp; Wonders<small>Gold Field, volcano, oasis, jungle, swamp + trade post, ruins &amp; monument</small></div>${seg('expWild',[{v:false,l:'Off'},{v:true,l:'On'}],s.expWild)}</div>
    <div><div class="field-lab">Voyages<small>Splits the map into two islands — build ships across the sea (lumber + wool)</small></div>${seg('expSea',[{v:false,l:'Off'},{v:true,l:'On'}],s.expSea)}</div>`:''}`;
  $('setup-body').querySelectorAll('[data-seg]').forEach(g=>{
    g.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      g.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      const raw=b.dataset.v, key=g.dataset.seg;
      draft[key]= raw==='true'?true: raw==='false'?false: isNaN(+raw)?raw:+raw;
      if(key==='bots'||key==='layout'||key==='expWild'||key==='mapSize'||key==='expSea') reDeal();
    });
  });
  $('set-colors').querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{
    $('set-colors').querySelectorAll('.swatch').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); draft.colorIdx=+b.dataset.i; reDeal();
  });
  $('setup-go').onclick=()=>{
    draft.name=$('set-name').value.trim()||'You';
    settings={...draft}; saveSettings();
    startGame();
  };
}

/* ---------------- modal helpers ---------------- */
function openSheet(html){ $('sheet').innerHTML=html; $('overlay').classList.add('on'); closePops(); }
function closeSheet(){ $('overlay').classList.remove('on'); $('sheet').innerHTML=''; }
const sheetOpen=()=>$('overlay').classList.contains('on');
$('overlay')?.addEventListener?.('click',e=>{ if(e.target.id==='overlay'&&$('overlay').dataset.lock!=='1') closeSheet(); });

function seg(name,opts,val){
  return `<div class="seg" data-seg="${name}">${opts.map(o=>`<button data-v="${o.v}" class="${String(o.v)===String(val)?'on':''}">${o.l}</button>`).join('')}</div>`;
}
/* ---------------- rules sheet ---------------- */
function openRules(){
  openSheet(`
    <h2>How to play</h2>
    <div class="rules">
      <p>First to the victory-point target wins. Settlements are worth 1 VP, cities 2, plus bonuses and hidden cards.</p>
      <h3>Your turn</h3>
      <ul><li><b>Roll</b> — every tile with that number pays out to buildings on its corners (cities pay double).</li>
      <li><b>Trade</b> — with the bank at 4:1, at harbours for 3:1 or 2:1, or haggle with rivals.</li>
      <li><b>Build</b> — roads (${costDots(COST.road)}), settlements (${costDots(COST.sett)}), cities (${costDots(COST.city)}), development cards (${costDots(COST.dev)}).</li>
      <li><b>End turn</b> — the same button you rolled with.</li></ul>
      <h3>The robber</h3>
      <p>Rolling <b>7</b> pays nothing. Anyone holding more than 7 cards discards half. The roller moves the robber to any tile — it blocks that tile's payouts — and steals one random card from a rival there.</p>
      <h3>Placement rules</h3>
      <ul><li>Settlements need an empty corner with <b>no neighbouring buildings</b> (distance rule), connected to your roads.</li>
      <li>Roads chain off your own roads and buildings; they can't pass through a rival's building.</li></ul>
      <h3>Development cards</h3>
      <ul><li><b>${ico('sword',11)} Knight</b> — move the robber and steal. 3+ knights = Largest Army (2 VP).</li>
      <li><b>${ico('road',11)} Road Building</b> — 2 free roads. <b>${ico('gift',11)} Year of Plenty</b> — take any 2 cards. <b>${ico('coins',11)} Monopoly</b> — claim all of one resource. <b>${ico('rosette',11)} Victory Point</b> — hidden VP.</li>
      <li>One card per turn, never on the turn you bought it (VP cards excepted).</li></ul>
      <h3>Bonuses</h3>
      <p><b>Longest Road</b> (5+ connected) and <b>Largest Army</b> (3+ knights) are worth 2 VP each — and can be stolen.</p>
      <h3>Controls</h3>
      <ul><li>Drag to orbit the island, pinch or scroll to zoom, double-click to recentre.</li>
      <li>Keys: <kbd>Space</kbd> roll / end turn · <kbd>1</kbd>–<kbd>4</kbd> road, settlement, city, card · <kbd>T</kbd> trade · <kbd>D</kbd> development cards · <kbd>Esc</kbd> cancel · <kbd>F</kbd> focus mode.</li></ul>
      <p style="margin-top:14px;font-size:11px;color:var(--faint)">Iconography from game-icons.net by Lorc, Delapouite &amp; Faithtoken (CC BY 3.0).</p>
    </div>
    <div class="sheet-actions"><button class="btn primary" onclick="closeSheet()">Got it</button></div>`);
}

/* ---------------- game start ---------------- */
function startGame(){
  haltAll();
  gameId++;
  mode=null; lastLogLen=-1;
  S=newGame({...settings});
  boardNewIsland(S);
  log(S,`A new island rises. First to <b>${S.settings.target} VP</b> wins.`,true);
  const first=S.players[S.setupQueue[0]];
  log(S,`<b>${first.name}</b> places first`,true);
  panelsHidden=false; document.body.classList.remove('panels-hidden');
  show('game');
  renderAll(); saveGame();
  advance();
}

/* ---------------- central driver ---------------- */
function advance(){
  if(!S||S.phase==='over'){ if(S&&S.phase==='over') showGameOver(); return; }
  saveGame();

  // pending discards (7 rolled)
  if(S.discardQueue.length){
    const pi=S.discardQueue[0], p=S.players[pi];
    if(p.bot){
      discard(S,p,botDiscard(S,p));
      renderAll();
      later(advance,tick()/2);
    } else openDiscard(p);
    return;
  }
  if(S.afterSeven){ // robber must move
    S.afterSeven=false;
    beginRobber();
    return;
  }

  const p=curP(S);
  if(S.phase==='setup'){
    if(p.bot) queueBot(()=>botSetupMove());
    else beginPlayerSetup();
    return;
  }
  if(S.phase==='play'){
    if(p.bot) queueBot(()=>botTurn());
    else beginPlayerTurn();
  }
}
function queueBot(fn){ stopBots(); botTimer=later(fn,tick()); }
function stopBots(){ if(botTimer){ clearTimeout(botTimer); timers.delete(botTimer); botTimer=null; } }

/* ---------------- setup phase ---------------- */
function beginPlayerSetup(){
  if(S.setupStep==='sett'){
    mode='setup-sett';
    hint('Tap a highlighted corner to place your settlement');
  } else {
    mode='setup-road';
    hint('Place a road next to it');
  }
  renderAll();
}
function botSetupMove(){
  const p=curP(S);
  if(S.setupStep==='sett'){
    const vk=botSetupSett(S,p);
    doSetupSett(p,vk);
  } else {
    const ek=botSetupRoad(S,p,S.lastSetupSett);
    doSetupRoad(p,ek);
  }
}
function doSetupSett(p,vk){
  const before={...S.players[0].res};
  placeSett(S,p,vk,true);
  S.lastSetupSett=vk;
  const round2=S.setupQueue.length<=S.players.length;
  if(round2) grantSetupResources(S,p,vk);
  S.setupStep='road';
  mode=null; renderAll();
  if(!p.bot) noteGains(before,'Your settlement yields');
  later(advance, p.bot?tick():0);
}
function doSetupRoad(p,ek){
  placeRoad(S,p,ek,true);
  S.setupQueue.shift();
  S.setupStep='sett'; S.lastSetupSett=null;
  mode=null;
  if(!S.setupQueue.length){
    S.phase='play'; S.turnPtr=0;
    log(S,`The founding is complete — <b>${curP(S).name}</b> opens play`,true);
  }
  renderAll();
  later(advance, p.bot?tick():0);
}

/* ---------------- player turn ---------------- */
function beginPlayerTurn(){
  mode=null;
  if(S.goldPending>0){ openGoldChooser(S.goldPending); return; }
  hint(S.rolled?'Build, trade, or end your turn':'Your turn — roll the dice');
  renderAll();
}
function openGoldChooser(n){
  $('overlay').dataset.lock='1';
  const picks=[];
  const bankFree=r=>S.bank[r]-picks.filter(x=>x===r).length>0;
  openSheet(`<h2>Gold Field</h2><div class="sub">Choose ${n} resource${n>1?'s':''} to take from the bank.</div>${resChoiceGrid('gold')}
    <div class="sheet-actions"><button class="btn primary" id="gold-ok" disabled>Take</button></div>`);
  const refresh=()=>{
    $('gold-ok').disabled=picks.length!==n;
    $('gold-ok').textContent=`Take (${picks.length}/${n})`;
    $('gold').querySelectorAll('.choice').forEach(b=>{
      const r=b.dataset.r, c=picks.filter(x=>x===r).length;
      b.classList.toggle('on',c>0);
      b.disabled=c===0&&!bankFree(r);
      b.innerHTML=`<span class="ic">${resChip(r,34,22)}</span>${RES_META[r].label}${c?` ×${c}`:''}`;
    });
  };
  $('gold').querySelectorAll('.choice').forEach(b=>b.onclick=()=>{
    const r=b.dataset.r, c=picks.filter(x=>x===r).length;
    if(picks.length<n&&bankFree(r)) picks.push(r);
    else if(c>0) picks.splice(picks.indexOf(r),1);
    refresh();
  });
  $('gold-ok').onclick=()=>{
    for(const r of picks){ S.bank[r]--; S.players[0].res[r]++; }
    S.goldPending=0; $('overlay').dataset.lock=''; closeSheet();
    for(const r of picks) bumpCard(r);
    beginPlayerTurn();
  };
  refresh();
}
function onRoll(){
  if(!S||busy||S.phase!=='play'||curP(S).bot||S.rolled) return;
  if(S.discardQueue.length||mode==='robber') return;
  closePops();
  const r=rollDice(S);
  if(r.seven) S.afterSeven=true;   // set now so a save mid-tumble still owes the robber
  saveGame();
  const g=gameId;
  rollShow(true,()=>{
    if(g!==gameId) return;
    afterAnyRoll();
    if(r.seven){ hint('Seven — the robber stirs'); renderAll(); later(advance,450); }
    else { hint('Build, trade, or end your turn'); renderAll(); if(S.goldPending>0) openGoldChooser(S.goldPending); }
  });
}
function afterAnyRoll(){
  if(!S.dice) return;
  const total=S.dice[0]+S.dice[1];
  if(board) board.pulse(total);
  if(total!==7) flyGains(total);
}
function beginRobber(){
  const p=curP(S);
  if(p.bot){
    const hid=botRobberHex(S,p);
    const victims=moveRobber(S,hid);
    if(victims.length){
      const t=botStealTarget(S,victims), r=steal(S,t);
      if(t===0&&r){ toast(`<b>${p.name}</b> stole your ${resChip(r,18,12)} <b>${RES_META[r].label}</b>`,'bad'); loseCard(r); }
    }
    renderAll();
    later(()=>{ afterRobber(); },tick());
  } else {
    mode='robber';
    hint('Move the robber — tap a tile to block it');
    renderAll();
  }
}
function afterRobber(){
  const p=curP(S);
  if(p.bot){ queueBot(()=>botTurn(true)); }
  else { mode=null; beginPlayerTurn(); }
}
function onHexTap(hid){
  if(mode!=='robber'||hid===S.board.robber) return;
  const victims=moveRobber(S,hid);
  mode=null; renderAll();
  if(victims.length===1){ humanSteal(victims[0]); renderAll(); afterRobberPlayer(); }
  else if(victims.length>1) openStealPicker(victims);
  else afterRobberPlayer();
}
function humanSteal(i){
  const r=steal(S,i);
  if(r){ toast(`You stole ${resChip(r,18,12)} <b>${RES_META[r].label}</b> from <b>${S.players[i].name}</b>`,'good'); later(()=>bumpCard(r),60); }
}
function afterRobberPlayer(){
  saveGame();
  if(!S.rolled) hint('Your turn — roll the dice');
  else hint('Build, trade, or end your turn');
  renderAll();
}
function openStealPicker(victims){
  $('overlay').dataset.lock='1';
  openSheet(`
    <h2>Steal from…</h2>
    <div class="sub">Pick a rival on that tile. You take one card at random.</div>
    <div class="partner-list">${victims.map(i=>{
      const p=S.players[i];
      return `<button class="partner" data-i="${i}"><span class="dot" style="background:${p.color}"></span><b>${p.name}</b><span class="st num">${ico('card',13)} ${handSize(p)} cards</span></button>`;
    }).join('')}</div>`);
  $('sheet').querySelectorAll('.partner').forEach(b=>b.onclick=()=>{
    $('overlay').dataset.lock=''; closeSheet();
    humanSteal(+b.dataset.i);
    renderAll(); afterRobberPlayer();
  });
}

/* build modes */
const CANCELLABLE=['road','sett','city','ship'];
function toggleMode(m){
  if(!S||curP(S).bot||busy) return;
  const ab=$("act-"+m);
  if(ab&&ab.classList.contains("off")){ hint(ab.dataset.reason||"Not available right now.",true); return; }
  if(!S.rolled) return;
  mode = mode===m?null:m;
  if(mode==='road') hint(S.freeRoads>0?`Free roads left: ${S.freeRoads} — tap an edge`:'Tap a highlighted edge to build a road');
  if(mode==='ship') hint('Tap a sea edge to set sail');
  if(mode==='sett') hint('Tap a highlighted corner to build a settlement');
  if(mode==='city') hint('Tap one of your settlements to upgrade it');
  if(!mode) hint('Build, trade, or end your turn');
  if(mode) closePops();   // clear the tray so the island is visible for placement
  renderAll();
}
function cancelMode(){
  if(!CANCELLABLE.includes(mode)) return;
  mode=null; hint('Build, trade, or end your turn'); renderAll();
}
function onVertexTap(vk){
  const p=curP(S);
  if(mode==='setup-sett'){ if(settSpots(S,p,true).includes(vk)) doSetupSett(p,vk); return; }
  if(mode==='sett'&&settSpots(S,p,false).includes(vk)&&canAfford(p,COST.sett)&&p.stock.sett>0){
    placeSett(S,p,vk,false); mode=null; hint('Settlement built'); renderAll(); winOrContinue();
  }
  if(mode==='city'&&citySpots(S,p).includes(vk)&&canAfford(p,COST.city)&&p.stock.city>0){
    placeCity(S,p,vk); mode=null; hint('City raised'); renderAll(); winOrContinue();
  }
}
function onEdgeTap(ek){
  const p=curP(S);
  if(mode==='setup-road'){ if(roadSpots(S,p,S.lastSetupSett).includes(ek)) doSetupRoad(p,ek); return; }
  if(mode==='road'&&roadSpots(S,p,null).includes(ek)&&p.stock.road>0){
    if(S.freeRoads>0){
      placeRoad(S,p,ek,true); S.freeRoads--;
      if(S.freeRoads<=0){ mode=null; hint('Build, trade, or end your turn'); }
      else hint(`Free roads left: ${S.freeRoads}`);
      renderAll(); winOrContinue(true);
    } else if(canAfford(p,COST.road)){
      placeRoad(S,p,ek,false);
      if(!canAfford(p,COST.road)){ mode=null; hint('Build, trade, or end your turn'); }
      renderAll(); winOrContinue(true);
    }
  }
  if(mode==='ship'&&shipSpots(S,p).includes(ek)&&p.stock.ship>0&&canAfford(p,COST.ship)){
    placeShip(S,p,ek,false);
    if(!canAfford(p,COST.ship)) mode=null;
    renderAll(); winOrContinue(true);
  }
}
function winOrContinue(stayInMode){
  saveGame();
  if(checkWin(S)){ renderAll(); showGameOver(); return; }
  if(!stayInMode) mode=null;
  renderAll();
}

/* dev cards */
function onBuyDev(){
  if(!S) return;
  const p=curP(S);
  if(p.bot||busy) return;
  const ab=$("act-dev");
  if(ab.classList.contains("off")){ hint(ab.dataset.reason||"Not available right now.",true); return; }
  if(!S.rolled||!canAfford(p,COST.dev)||!S.devDeck.length) return;
  const c=buyDev(S,p);
  hint(`You drew ${DEV_META[c].label}${c==='vp'?' — worth 1 hidden point':' — playable from next turn'}`);
  toast(`${ico(DEV_ICO[c],16)} New card: <b>${DEV_META[c].label}</b>`,'gold');
  closePops();
  renderAll(); winOrContinue();
}
function onPlayDev(card){
  const p=curP(S);
  if(p.bot||busy||p.playedDevThisTurn||!p.dev.includes(card)||card==='vp') return;
  closePops();
  if(!S.rolled&&card!=='knight') return; // only knight may be played before rolling
  if(card==='knight'){ playDev(S,p,card); renderAll(); if(checkWin(S)){showGameOver();return;} beginRobber(); return; }
  if(card==='road'){
    playDev(S,p,card);
    S.freeRoads=Math.min(2,p.stock.road);
    mode='road'; hint(`Free roads left: ${S.freeRoads} — tap an edge`);
    renderAll(); return;
  }
  if(card==='plenty'){ openPlentyPicker(p); return; }
  if(card==='mono'){ openMonoPicker(p); return; }
}
function resChoiceGrid(id){
  return `<div class="choice-grid" id="${id}">${RES.map(r=>`<button class="choice" data-r="${r}"><span class="ic">${resChip(r,34,22)}</span>${RES_META[r].label}</button>`).join('')}</div>`;
}
function openPlentyPicker(p){
  $('overlay').dataset.lock='1';
  const picks=[];
  openSheet(`<h2>Year of Plenty</h2><div class="sub">Take any two resources from the bank.</div>
    ${resChoiceGrid('yop')}<div class="sheet-actions">
    <button class="btn ghost" id="yop-cancel">Cancel</button>
    <button class="btn primary" id="yop-ok" disabled>Take cards</button></div>`);
  const refresh=()=>{ $('yop-ok').disabled=picks.length!==2;
    $('yop').querySelectorAll('.choice').forEach(b=>{
      const n=picks.filter(x=>x===b.dataset.r).length;
      b.classList.toggle('on',n>0);
      b.innerHTML=`<span class="ic">${resChip(b.dataset.r,34,22)}</span>${RES_META[b.dataset.r].label}${n?` ×${n}`:''}`;
    });};
  $('yop').querySelectorAll('.choice').forEach(b=>b.onclick=()=>{
    const r=b.dataset.r;
    const n=picks.filter(x=>x===r).length;
    if(n>0&&picks.length>=2){ picks.splice(picks.indexOf(r),1); }
    else if(picks.length<2&&S.bank[r]>picks.filter(x=>x===r).length) picks.push(r);
    else if(n>0) picks.splice(picks.indexOf(r),1);
    refresh();
  });
  $('yop-cancel').onclick=()=>{ $('overlay').dataset.lock=''; closeSheet(); };
  $('yop-ok').onclick=()=>{
    playDev(S,p,'plenty'); yearOfPlenty(S,p,picks[0],picks[1]);
    $('overlay').dataset.lock=''; closeSheet(); renderAll();
    for(const r of new Set(picks)) bumpCard(r);
    winOrContinue();
  };
}
function openMonoPicker(p){
  $('overlay').dataset.lock='1';
  openSheet(`<h2>Monopoly</h2><div class="sub">Name a resource — every rival hands over all of theirs.</div>
    ${resChoiceGrid('mono')}<div class="sheet-actions">
    <button class="btn ghost" id="mono-cancel">Cancel</button></div>`);
  $('mono').querySelectorAll('.choice').forEach(b=>b.onclick=()=>{
    const r=b.dataset.r, before=p.res[r];
    playDev(S,p,'mono'); monopoly(S,p,r);
    $('overlay').dataset.lock=''; closeSheet(); renderAll();
    toast(`Monopoly: ${resChip(r,18,12)} <b>+${p.res[r]-before} ${RES_META[r].label}</b>`,'good'); bumpCard(r);
    winOrContinue();
  });
  $('mono-cancel').onclick=()=>{ $('overlay').dataset.lock=''; closeSheet(); };
}

/* discard modal */
function openDiscard(p){
  $('overlay').dataset.lock='1';
  const need=Math.floor(handSize(p)/2);
  const sel={wood:0,brick:0,sheep:0,wheat:0,ore:0};
  openSheet(`<h2>Discard ${need} cards</h2><div class="sub">A seven was rolled and you hold more than 7 cards.</div>
    <div class="trade-grid give" id="dis"></div>
    <div class="sheet-actions"><button class="btn primary" id="dis-ok" disabled>Discard</button></div>`);
  const draw=()=>{
    $('dis').innerHTML=RES.filter(r=>p.res[r]>0).map(r=>`
      <div class="trow"><div class="rname">${resChip(r,24,15)}${RES_META[r].label} <span class="num" style="color:var(--dim);font-weight:500">×${p.res[r]}</span></div>
      <div class="stepper"><button data-r="${r}" data-d="-1" ${sel[r]<=0?'disabled':''} aria-label="Keep one ${RES_META[r].label}">−</button><span class="v num">${sel[r]}</span><button data-r="${r}" data-d="1" ${sel[r]>=p.res[r]||sum(sel)>=need?'disabled':''} aria-label="Discard one ${RES_META[r].label}">+</button></div></div>`).join('');
    $('dis-ok').disabled=sum(sel)!==need;
    $('dis-ok').textContent=`Discard (${sum(sel)}/${need})`;
    $('dis').querySelectorAll('button').forEach(b=>b.onclick=()=>{ sel[b.dataset.r]+=+b.dataset.d; draw(); });
  };
  draw();
  $('dis-ok').onclick=()=>{
    discard(S,p,sel);
    $('overlay').dataset.lock=''; closeSheet(); renderAll();
    later(advance,100);
  };
}

/* ---------------- trade ---------------- */
function openTrade(){
  if(!S) return;
  const p=curP(S);
  if(p.bot||!S.rolled||busy||S.phase!=='play'||mode==='robber') return;
  // one persistent offer — survives a rival's rejection so you just tweak and re-offer
  const give={wood:0,brick:0,sheep:0,wheat:0,ore:0}, get={wood:0,brick:0,sheep:0,wheat:0,ore:0};

  const bankValid=()=>{
    let credits=0;
    for(const r of RES){
      if(give[r]===0) continue;
      const rate=rateFor(S,p,r);
      if(give[r]%rate!==0) return false;
      credits+=give[r]/rate;
    }
    const want=sum(get);
    return credits>0&&want===credits&&RES.every(r=>get[r]<=S.bank[r])&&sum(give)>0;
  };
  const offerValid=()=>sum(give)>0&&sum(get)>0&&RES.every(r=>give[r]===0||get[r]===0);
  const summaryText=()=>{
    if(sum(give)===0&&sum(get)===0) return '<small>Use − / + to set what you give and what you want.</small>';
    const note = bankValid() ? '<span style="color:var(--good)">Bank trade ready</span>'
      : offerValid() ? '<span style="color:var(--good)">Ready to offer rivals</span>'
      : '<span style="color:var(--dim)">For the bank, give exact multiples of each rate that add up to what you get.</span>';
    return `Give ${fmtBundle(give)} &nbsp;→&nbsp; get ${fmtBundle(get)}<br><small>${note}</small>`;
  };
  // one-tap bank swaps: anything you hold enough of, toward what you're short of
  const quickHTML=()=>{
    const out=[];
    for(const r of RES){
      const rate=rateFor(S,p,r);
      if(p.res[r]<rate) continue;
      for(const w of RES){
        if(w===r||S.bank[w]<1||p.res[w]>=2) continue;
        out.push(`<button class="qbtn" data-g="${r}" data-w="${w}" title="Bank: ${rate} ${RES_META[r].label} for 1 ${RES_META[w].label}">${rate}× ${resChip(r,18,12)} → ${resChip(w,18,12)}</button>`);
      }
    }
    return out.slice(0,8).join('');
  };

  const rowHTML=r=>{
    const rate=rateFor(S,p,r);
    return `
    <div class="t2row" id="tr-${r}">
      <div class="stepper"><button data-s="g" data-r="${r}" data-d="-1" aria-label="Give one less ${RES_META[r].label}">−</button><span class="v num" id="gv-${r}">${give[r]}</span><button data-s="g" data-r="${r}" data-d="1" aria-label="Give one more ${RES_META[r].label}">+</button></div>
      <div class="t2res">${resChip(r,22,14)}<b>${RES_META[r].label}</b><span class="t2have num">×${p.res[r]}</span><span class="rate-tag${rate<4?' best':''}" title="bank rate">${rate}:1</span></div>
      <div class="stepper"><button data-s="r" data-r="${r}" data-d="-1" aria-label="Want one less ${RES_META[r].label}">−</button><span class="v num" id="rv-${r}">${get[r]}</span><button data-s="r" data-r="${r}" data-d="1" aria-label="Want one more ${RES_META[r].label}">+</button></div>
    </div>`;
  };
  const editorHTML=()=>`<h2>Trade</h2>
    <div class="quick" id="t-quick">${quickHTML()}</div>
    <div class="trade2" id="t2">
      <div class="t2head"><span>Give</span><span>Resource</span><span>Get</span></div>
      ${RES.map(rowHTML).join('')}
    </div>
    <div class="trade-summary" id="t-sum"></div>
    <div class="sheet-actions">
      <button class="btn" id="t-bank" disabled>Bank trade</button>
      <button class="btn" id="t-players" disabled ${S.players.length<2?'style="display:none"':''}>Offer rivals</button>
      <button class="btn ghost" id="t-close">Close</button>
    </div>`;

  const refresh=()=>{
    for(const r of RES){
      $('gv-'+r).textContent=give[r]; $('rv-'+r).textContent=get[r];
      $('tr-'+r).classList.toggle('g',give[r]>0); $('tr-'+r).classList.toggle('r',get[r]>0);
    }
    $('sheet').querySelectorAll('.stepper button').forEach(b=>{
      const r=b.dataset.r, o=b.dataset.s==='g'?give:get, d=+b.dataset.d;
      b.disabled = d<0 ? o[r]<=0 : (b.dataset.s==='g' ? o[r]>=p.res[r] : o[r]>=S.bank[r]);
    });
    $('t-sum').innerHTML=summaryText();
    $('t-bank').disabled=!bankValid();
    $('t-players').disabled=!offerValid();
    $('t-bank').classList.toggle('primary',bankValid());
  };
  const showEditor=note=>{
    openSheet(editorHTML());
    $('sheet').querySelectorAll('.stepper button').forEach(b=>b.onclick=()=>{
      const o=b.dataset.s==='g'?give:get;
      o[b.dataset.r]=Math.max(0,o[b.dataset.r]+ +b.dataset.d);
      refresh();
    });
    $('sheet').querySelectorAll('.qbtn').forEach(b=>b.onclick=()=>{
      for(const r of RES){ give[r]=0; get[r]=0; }
      give[b.dataset.g]=rateFor(S,p,b.dataset.g); get[b.dataset.w]=1;
      doBank();
    });
    $('t-close').onclick=closeSheet;
    $('t-bank').onclick=doBank;
    $('t-players').onclick=doOffer;
    refresh();
    if(note) $('t-sum').innerHTML=note;
  };
  const doBank=()=>{
    if(!bankValid()) return;
    for(const r of RES){ p.res[r]-=give[r]; S.bank[r]+=give[r]; }
    for(const r of RES){ S.bank[r]-=get[r]; p.res[r]+=get[r]; }
    log(S,`<b>${p.name}</b> traded with the bank`);
    closeSheet(); renderAll(); saveGame();
    toast(`Traded ${fmtBundle(give)} for ${fmtBundle(get)}`,'good');
    for(const r of RES) if(get[r]>0) bumpCard(r);
  };
  const doOffer=()=>{
    const bots=S.players.filter(o=>o.bot);
    const answers=bots.map(b=>({p:b,yes:botEvaluateOffer(S,b,give,get)}));
    const anyYes=answers.some(a=>a.yes);
    openSheet(`<h2>Your offer</h2>
      <div class="offer-line">${bundleHTML(give)}<span class="arrow">for</span>${bundleHTML(get)}</div>
      <div class="partner-list">${answers.map(a=>`
        <button class="partner" data-i="${a.p.i}" ${a.yes?'':'disabled style="opacity:.45"'}>
          <span class="dot" style="background:${a.p.color}"></span><b>${a.p.name}</b>
          <span class="st" style="color:${a.yes?'var(--good)':'var(--bad)'}">${a.yes?'Accepts — trade':'Declines'}</span>
        </button>`).join('')}</div>
      <div class="sheet-actions"><button class="btn ghost" id="t-adjust">${anyYes?'Back to offer':'Adjust and retry'}</button></div>`);
    // returns to the SAME editor with give/get intact — no re-setup after a rejection
    $('t-adjust').onclick=()=>showEditor(anyYes?null:'<span style="color:var(--bad)">No takers — tweak the offer and try again.</span>');
    $('sheet').querySelectorAll('.partner:not([disabled])').forEach(b=>b.onclick=()=>{
      const who=S.players[+b.dataset.i];
      playerTrade(S,p,who,give,get);
      closeSheet(); renderAll(); saveGame();
      toast(`<b>${who.name}</b> traded with you`,'good');
      for(const r of RES) if(get[r]>0) bumpCard(r);
    });
  };

  showEditor();
}
function fmtBundle(o){
  const parts=RES.filter(r=>o[r]>0).map(r=>`<b class="num">${o[r]}</b> ${RES_META[r].label}`);
  return parts.join(' + ')||'nothing';
}
function bundleHTML(o){
  const parts=RES.filter(r=>o[r]>0).map(r=>`<span class="n num">${o[r]}</span>${resChip(r,20,13)}`);
  return `<span class="bundle">${parts.join('')||'nothing'}</span>`;
}

/* bot offering the player a trade */
function botOfferToPlayer(bot,done){
  const needs=botNeeds(S,bot);
  const human=S.players[0];
  let want=null;
  for(const r of RES) if((needs[r]||0)>bot.res[r]&&human.res[r]>0){ want=r; break; }
  const spare=RES.filter(r=>!(needs[r]>0)&&bot.res[r]>=2).sort((a,b)=>bot.res[b]-bot.res[a])[0];
  if(!want||!spare||!S.settings.botTrades){ done(); return; }
  const give={[spare]:1}, get={[want]:1};
  openSheet(`<h2>${bot.name} offers a trade</h2>
    <div class="sub">They give you ${fmtBundle(give)} for your ${fmtBundle(get)}.</div>
    <div class="offer-line">${bundleHTML({...{wood:0,brick:0,sheep:0,wheat:0,ore:0},...give})}<span class="arrow">for your</span>${bundleHTML({...{wood:0,brick:0,sheep:0,wheat:0,ore:0},...get})}</div>
    <div class="sheet-actions">
      <button class="btn ghost" id="bo-no">Decline</button>
      <button class="btn primary" id="bo-yes">Accept</button>
    </div>`);
  $('overlay').dataset.lock='1';
  const finish=()=>{ $('overlay').dataset.lock=''; closeSheet(); renderAll(); done(); };
  $('bo-no').onclick=finish;
  $('bo-yes').onclick=()=>{ playerTrade(S,bot,human,give,get); finish(); bumpCard(spare); };
}

/* ---------------- bot turn driver ---------------- */
function botTurn(afterKnight){
  const p=curP(S);
  if(!p.bot||S.phase!=='play'){ advance(); return; }

  if(!S.rolled){
    if(!afterKnight){
      // pre-roll knight if the robber is squatting on the bot
      const dv=botMaybePlayDev(S,p);
      if(dv==='knight'){
        const h=S.board.hexes[S.board.robber];
        const onUs=hexCorners(h.x,h.y).some(([x,y])=>{const v=S.board.V[vkey(x,y)];return v&&v.bld&&v.bld.p===p.i;});
        if(onUs){ playDev(S,p,'knight'); renderAll(); if(checkWin(S)){showGameOver();return;} queueBot(()=>beginRobber()); return; }
      }
    }
    const r=rollDice(S);
    if(r.seven) S.afterSeven=true;
    saveGame();
    const g=gameId;
    rollShow(false,()=>{
      if(g!==gameId) return;
      afterAnyRoll();
      renderAll();
      if(r.seven){ later(advance,tick()); return; }
      queueBot(()=>botTurn(true));
    });
    return;
  }

  // one dev play per turn
  if(!p.playedDevThisTurn){
    const dv=botMaybePlayDev(S,p);
    if(dv==='knight'){ playDev(S,p,'knight'); renderAll(); if(checkWin(S)){showGameOver();return;} queueBot(()=>beginRobber()); return; }
    if(dv==='road'){
      playDev(S,p,'road');
      for(let i=0;i<2&&p.stock.road>0;i++){
        const opts=roadSpots(S,p,null);
        if(!opts.length) break;
        placeRoad(S,p,botBestRoad(S,p,opts),true);
      }
      renderAll(); if(checkWin(S)){showGameOver();return;}
      queueBot(()=>botTurn(true)); return;
    }
    if(dv==='plenty'){ playDev(S,p,'plenty'); const [a,b]=botPlentyPick(S,p); yearOfPlenty(S,p,a,b); renderAll(); queueBot(()=>botTurn(true)); return; }
    if(dv==='mono'){
      const r=botMonopolyPick(S,p), mine=S.players[0].res[r];
      playDev(S,p,'mono'); monopoly(S,p,r);
      if(mine>0){ toast(`<b>${p.name}</b> played Monopoly — you lose ${resChip(r,18,12)} <b>${mine} ${RES_META[r].label}</b>`,'bad'); loseCard(r); }
      renderAll(); queueBot(()=>botTurn(true)); return;
    }
  }

  // build/trade steps
  const act=botStep(S,p);
  if(act){
    renderAll();
    bumpRival(p.i);
    if(checkWin(S)){ showGameOver(); return; }
    queueBot(()=>botTurn(true));
    return;
  }

  // maybe pitch the human a trade, then end turn
  const maybeOffer = S.settings.botTrades && Math.random()<0.3 && handSize(S.players[0])>0;
  const finish=()=>{
    endTurn(S);
    renderAll(); saveGame();
    later(advance,tick()/2);
  };
  if(maybeOffer) botOfferToPlayer(p,finish);
  else finish();
}
function botBestRoad(S,p,opts){
  let best=opts[0],bs=-1;
  for(const ek of opts){
    const e=S.board.E[ek];
    for(const end of [e.a,e.b]){
      const v=S.board.V[end];
      if(!v.bld&&!v.adj.some(k=>S.board.V[k].bld)){
        const s=vertexScore(S,end,p);
        if(s>bs){bs=s;best=ek;}
      }
    }
  }
  return best;
}

/* ---------------- end turn / game over ---------------- */
function onEndTurn(){
  if(!S||busy) return;
  const p=curP(S);
  if(p.bot||!S.rolled||S.phase!=='play'||mode==='robber'||S.discardQueue.length) return;
  if(checkWin(S)){ showGameOver(); return; }
  mode=null; S.freeRoads=0;
  closePops();
  endTurn(S);
  renderAll(); saveGame();
  later(advance,100);
}
function onPrimary(){
  if(!S) return;
  if(S.rolled) onEndTurn(); else onRoll();
}
function showGameOver(){
  haltAll(); saveGame(); mode=null; renderAll();
  const w=S.players[S.winner];
  const rows=S.players.slice().sort((a,b)=>vp(S,b,true)-vp(S,a,true)).map(p=>{
    const bits=[];
    if(S.longestRoad.owner===p.i) bits.push(ico('road',11)+' Longest Road');
    if(S.largestArmy.owner===p.i) bits.push(ico('sword',11)+' Largest Army');
    if(p.devVp) bits.push(ico('rosette',11)+` ×${p.devVp}`);
    return `<div class="srow${p.i===w.i?' win':''}"><span class="dot" style="background:${p.color}"></span>
      <div><b>${p.name}</b><div style="font-size:11.5px;color:var(--dim)">${bits.join(' · ')||'&nbsp;'}</div></div>
      <span class="pts num">${vp(S,p,true)} VP</span></div>`;
  }).join('');
  $('overlay').dataset.lock='1';
  openSheet(`<div class="finale">
      <div class="crest-big">${ico(w.bot?'flag':'crown',46)}</div>
      <div class="fbig">${w.bot?`${w.name} wins`:'Victory'}</div>
      <div class="sub">${w.bot?'The island falls to a rival.':'The island is yours.'}</div>
      <div class="standings">${rows}</div>
      <div class="sheet-actions">
        <button class="btn ghost" id="go-menu">Menu</button>
        <button class="btn primary" id="go-again">Play again</button>
      </div></div>`);
  if(!w.bot&&!matchMedia('(prefers-reduced-motion:reduce)').matches) confetti();
  $('go-menu').onclick=()=>{ $('overlay').dataset.lock=''; closeSheet(); show('menu'); refreshMenu(); };
  $('go-again').onclick=()=>{ $('overlay').dataset.lock=''; closeSheet(); startGame(); };
}
function confetti(){
  const box=el('div','confetti');
  const cols=['#e0b15e','#f0c778','#eae4d3','#7fc98a','#4c9ee3','#e0555a'];
  for(let i=0;i<90;i++){
    const c=el('i');
    c.style.left=(Math.random()*100)+'vw';
    c.style.background=cols[i%cols.length];
    c.style.setProperty('--dx',(Math.random()*160-80)+'px');
    c.style.setProperty('--rot',(Math.random()*900-450)+'deg');
    c.style.animationDuration=(2.2+Math.random()*2)+'s';
    c.style.animationDelay=(Math.random()*0.8)+'s';
    box.appendChild(c);
  }
  document.body.appendChild(box);
  setTimeout(()=>box.remove(),5200);
}

/* ---------------- feedback: hint, toasts, dice, flying resources ---------------- */
function hint(msg,warn){
  const h=$('hint');
  $('hint-text').textContent=msg;
  h.classList.remove('hide','shake');
  h.classList.toggle('warn',!!warn);
  if(warn){ void h.offsetWidth; h.classList.add('shake'); }
}
function toast(html,kind,ms){
  const box=$('toasts'); if(!box) return;
  const t=el('div','toast '+(kind||''),html);
  box.appendChild(t);
  while(box.children.length>3) box.firstChild.remove();
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),380); },ms||3200);
}
function noteGains(before,lead){
  const me=S.players[0];
  const got=RES.filter(r=>me.res[r]>before[r]);
  if(!got.length) return;
  toast(`${lead} ${got.map(r=>`<span class="rchip">+${me.res[r]-before[r]} ${resChip(r,18,12)}</span>`).join(' ')}`,'good');
  got.forEach((r,i)=>setTimeout(()=>bumpCard(r),i*90));
}
function bumpCard(r){
  const c=document.querySelector(`#hand .rescard[data-r="${r}"]`);
  if(!c) return;
  c.classList.remove('bump','lose'); void c.offsetWidth; c.classList.add('bump');
}
function loseCard(r){
  const c=document.querySelector(`#hand .rescard[data-r="${r}"]`);
  if(!c) return;
  c.classList.remove('bump','lose'); void c.offsetWidth; c.classList.add('lose');
}
function bumpRival(i){
  const c=document.querySelector(`#opponents .rival[data-i="${i}"]`);
  if(!c) return;
  c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}

const PIP_POS={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
const pipSVG=(n,size,col)=>`<svg viewBox="-11 -11 22 22" width="${size}" height="${size}">${PIP_POS[n].map(([x,y])=>`<circle cx="${x*5.5}" cy="${y*5.5}" r="2.2" fill="${col||'#1c2431'}"/>`).join('')}</svg>`;
// cube rotation that brings face n to the front (faces laid out in style.css)
const FACE_ROT={1:[0,0],6:[0,180],2:[0,-90],5:[0,90],3:[-90,0],4:[90,0]};

/** Tumble two cubes onto the rolled faces, then hand back to the game. */
function rollShow(human,done){
  const d=S.dice, box=$('dicebox');
  const dur=human?1050:Math.max(520,Math.min(900,tick()*1.3));
  busy=human; diceHidden=true;
  renderAll();
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(panelsHidden||reduce){ diceHidden=false; busy=false; later(done,human?150:0); return; }
  const cube=n=>`<div class="cube">${[1,2,3,4,5,6].map(f=>`<div class="face f${f}">${pipSVG(f,40)}</div>`).join('')}</div>`;
  const total=d[0]+d[1];
  box.innerHTML=cube(d[0])+cube(d[1])+`<div class="dice-shadow"></div><div class="dice-total num${total===7?' seven':''}">${total}</div>`;
  box.classList.remove('settled'); void box.offsetWidth; box.classList.add('show');
  box.querySelectorAll('.cube').forEach((c,i)=>{
    const [fx,fy]=FACE_ROT[d[i]];
    const sx=fx+360*(2+i)+Math.random()*90, sy=fy+360*(1+i)+Math.random()*90;
    const side=i?1:-1;
    c.animate([
      {transform:`translate(${side*70}px,-150px) rotateX(${sx}deg) rotateY(${sy}deg)`},
      {transform:`translate(${side*10}px,6px) rotateX(${fx+20}deg) rotateY(${fy-15}deg)`,offset:.72},
      {transform:`translate(0,-10px) rotateX(${fx-6}deg) rotateY(${fy+4}deg)`,offset:.86},
      {transform:`translate(0,0) rotateX(${fx}deg) rotateY(${fy}deg)`}
    ],{duration:dur,easing:'cubic-bezier(.2,.75,.3,1)',fill:'forwards'});
  });
  later(()=>{
    box.classList.add('settled');
    diceHidden=false; busy=false;
    done();
  },dur);
  later(()=>{ box.classList.remove('show','settled'); },dur+(human?1000:Math.max(400,tick())));
}

/** Payouts travel from the producing tiles into the hand. */
function flyGains(total){
  const g=S.lastGains&&S.lastGains[0];
  if(!g||!board||!board.hexScreen) return;
  const left={...g};
  if(!RES.some(r=>left[r]>0)) return;
  const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
  let k=0;
  for(const h of S.board.hexes){
    if(h.num!==total||h.id===S.board.robber||!RES.includes(h.terrain)) continue;
    let n=0;
    for(const [x,y] of hexCorners(h.x,h.y)){ const v=S.board.V[vkey(x,y)]; if(v&&v.bld&&v.bld.p===0) n+=v.bld.type==='city'?2:1; }
    n=Math.min(n,left[h.terrain]);
    if(n<=0) continue;
    left[h.terrain]-=n;
    const from=board.hexScreen(h.id);
    for(let i=0;i<n;i++) spawnFly(h.terrain,from,(k++)*120,reduce);
  }
  const got=RES.filter(r=>g[r]>0);
  toast(`You collect ${got.map(r=>`<span class="rchip">+${g[r]} ${resChip(r,18,12)}</span>`).join(' ')}`,'good',2600);
}
function spawnFly(r,from,delay,reduce){
  const card=document.querySelector(`#hand .rescard[data-r="${r}"]`);
  if(!card||!from||!from.visible||panelsHidden||reduce||$('dock').classList.contains('collapsed')){ setTimeout(()=>bumpCard(r),delay+300); return; }
  const to=card.getBoundingClientRect();
  const tx=to.left+to.width/2-15, ty=to.top+to.height/2-15, fx=from.x-15, fy=from.y-15;
  const f=el('div','flyres',gico(r,18));
  f.style.background=RES_META[r].col;
  f.style.opacity='0';
  document.body.appendChild(f);
  const midX=(fx+tx)/2+(Math.random()*60-30), midY=Math.min(fy,ty)-90;
  const a=f.animate([
    {transform:`translate(${fx}px,${fy}px) scale(.4)`,opacity:0},
    {transform:`translate(${fx}px,${fy-24}px) scale(1.15)`,opacity:1,offset:.18},
    {transform:`translate(${midX}px,${midY}px) scale(1)`,opacity:1,offset:.55},
    {transform:`translate(${tx}px,${ty}px) scale(.7)`,opacity:.9}
  ],{duration:850,delay,easing:'cubic-bezier(.45,.05,.4,1)',fill:'forwards'});
  a.onfinish=()=>{ f.remove(); bumpCard(r); };
}

/* ---------------- rendering ---------------- */
function renderAll(){
  if(!S) return;
  renderBoard(); renderOpponents(); renderDock(); renderLog(); renderFlag(); renderHint();
  if(!$('devpop').hidden) renderDevPop();
  syncChrome();
}
function renderFlag(){
  const p=curP(S), me=!p.bot;
  let st;
  if(S.phase==='over') st='game over';
  else if(S.phase==='setup') st=me?(S.setupStep==='sett'?'place a settlement':'place a road'):'founding';
  else if(me) st=busy?'rolling…':mode==='robber'?'move the robber':!S.rolled?'roll the dice':'build, trade or end';
  else st='playing';
  const think=(p.bot&&S.phase!=='over')?'<span class="thinking"><i></i><i></i><i></i></span>':'';
  let dice='';
  if(S.dice&&!diceHidden){
    const t=S.dice[0]+S.dice[1];
    dice=`<span class="tb-dice${t===7?' seven':''}" title="Last roll">${S.dice.map(n=>`<span class="mini">${pipSVG(n,15)}</span>`).join('')}<b class="num">${t}</b></span>`;
  }
  setHTML($('turnflag'),`<span class="dot" style="background:${p.color}"></span><span class="tb-who"><span class="nm">${me?'Your turn':p.name+'’s turn'}${think}</span><span class="st">${st}</span></span>${dice}<span class="tb-goal">First to ${S.settings.target}</span>`);
  $('turnflag').classList.toggle('mine',me&&S.phase!=='over');
}
function renderHint(){
  const h=$('hint'), p=curP(S);
  const show=!p.bot&&S.phase!=='over'&&!panelsHidden;
  h.classList.toggle('hide',!show);
  h.classList.toggle('mode',CANCELLABLE.includes(mode));
  $('hint-cancel').hidden=!CANCELLABLE.includes(mode);
}
function renderLog(){
  const box=$('log');
  setHTML(box,S.log.slice().reverse().slice(0,40).map(l=>`<div class="l ${l.sys?'sys':''}">${l.msg}</div>`).join(''));
  if(S.log.length!==lastLogLen){
    lastLogLen=S.log.length;
    box.classList.remove('idle','fresh'); void box.offsetWidth; box.classList.add('fresh');
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>box.classList.add('idle'),5200);
  }
}
function renderOpponents(){
  const box=$('opponents');
  const rivals=S.players.filter(p=>p.bot);
  const ids=rivals.map(p=>p.i+p.color).join();
  if(box._ids!==ids){
    box._ids=ids; box.innerHTML='';
    for(const p of rivals){
      const d=el('div','rival');
      d.dataset.i=p.i;
      d.style.setProperty('--pc',p.color);
      d.innerHTML=`<div class="rtop"><span class="dot" style="background:${p.color}"></span><span class="name">${p.name}</span><span class="vp num"></span></div><div class="meta num"></div>`;
      box.appendChild(d);
    }
  }
  for(const p of rivals){
    const d=box.querySelector(`.rival[data-i="${p.i}"]`);
    d.classList.toggle('active',curP(S).i===p.i&&S.phase!=='over');
    const badges=[];
    if(S.longestRoad.owner===p.i) badges.push(`<span title="Longest Road">${ico('road',12)}</span>`);
    if(S.largestArmy.owner===p.i) badges.push(`<span title="Largest Army">${ico('sword',12)}</span>`);
    setHTML(d.querySelector('.vp'),`${vp(S,p,false)}<small>VP</small>`);
    const hs=handSize(p);
    setHTML(d.querySelector('.meta'),`<span title="Resource cards"${hs>7?' class="warn"':''}>${ico('card',12)} <b>${hs}</b></span><span title="Development cards">${ico('scroll',12)} <b>${p.dev.length+p.newdev.length}</b></span><span class="opt" title="Knights played">${ico('sword',12)} <b>${p.knights}</b></span><span class="opt" title="Longest road">${ico('road',12)} <b>${p.roadLen||0}</b></span>${badges.length?`<span class="rbadge">${badges.join('')}</span>`:''}`);
  }
}

function needMsg(me,cost){
  const miss=RES.filter(r=>me.res[r]<(cost[r]||0)).map(r=>`${cost[r]-me.res[r]} ${RES_META[r].label}`);
  return miss.length?`Need ${miss.join(" + ")}.`:null;
}
// returns null when the action is available, else a short reason string
function buildReason(me,kind){
  if(S.phase!=='play') return "Finish the founding first.";
  if(!S.rolled) return "Roll the dice first.";
  if(S.discardQueue.length) return "Discard down to 7 cards first.";
  if(mode==="robber") return "Move the robber first.";
  if(kind==="dev"){ if(!S.devDeck.length) return "The development deck is sold out."; return needMsg(me,COST.dev); }
  if(kind==="city"){ if(me.stock.city<=0) return "No city pieces left."; if(!citySpots(S,me).length) return "You have no settlement to upgrade."; return needMsg(me,COST.city); }
  if(kind==="sett"){ if(me.stock.sett<=0) return "No settlement pieces left."; if(!settSpots(S,me,false).length) return "No legal spot — needs an open corner on your roads, two away from any building."; return needMsg(me,COST.sett); }
  if(kind==="road"){ if(me.stock.road<=0) return "No road pieces left."; if(!roadSpots(S,me,null).length) return "No legal spot to extend a road."; if(S.freeRoads>0) return null; return needMsg(me,COST.road); }
  if(kind==="ship"){ if(!S.hasSea) return "Ships need the Voyages map."; if(me.stock.ship<=0) return "No ship pieces left."; if(!shipSpots(S,me).length) return "No sea route — build a ship from a coast."; return needMsg(me,COST.ship); }
  return null;
}
// cost as resource chips; the ones you can't cover yet are dimmed
function costChips(cost,me){
  let out='';
  for(const [r,n] of Object.entries(cost)) for(let i=0;i<n;i++)
    out+=`<span class="cchip${me&&me.res[r]<=i?' miss':''}" style="background:${RES_META[r].col}" title="${RES_META[r].label}">${gico(r,10)}</span>`;
  return out;
}
// a card bought this turn sits in newdev, so me.dev holds only the playable ones
function devPlayable(me,c){
  const myTurn=curP(S).i===0;
  return myTurn&&!busy&&!me.playedDevThisTurn&&c!=='vp'&&me.dev.includes(c)&&(S.rolled||c==='knight')&&S.phase==='play'&&!S.discardQueue.length&&mode!=='robber';
}
function ensureHand(){
  const hand=$('hand');
  if(hand.children.length) return;
  RES.forEach(r=>{
    const c=el('div','rescard');
    c.dataset.r=r;
    c.style.setProperty('--rc',RES_META[r].col);
    c.innerHTML=`<span class="ic">${resIconHTML(r,19)}</span><span class="ct num">0</span><span class="lb">${RES_META[r].label}</span>`;
    hand.appendChild(c);
  });
  const d=el('button','devcard');
  d.id='devcard'; d.type='button'; d.title='Development cards (D)';
  d.innerHTML=`<span class="ic">${ico('scroll',17)}</span><span class="ct num">0</span><span class="lb">Cards</span>`;
  d.onclick=e=>{ e.stopPropagation(); toggleDev(); };
  hand.appendChild(d);
}
function renderDock(){
  const me=S.players[0];
  const myTurn=curP(S).i===0&&S.phase!=='over';
  $('dock').classList.toggle('active',myTurn);
  if(!myTurn){ closePop('buildpop'); }
  const badges=[];
  if(S.longestRoad.owner===0) badges.push(`<span title="Longest Road">${ico('road',13)}</span>`);
  if(S.largestArmy.owner===0) badges.push(`<span title="Largest Army">${ico('sword',13)}</span>`);
  setHTML($('bar-vp'),`<span class="v num">${vp(S,me,true)}</span><span class="of">of ${S.settings.target} VP</span><span class="bdg">${badges.join('')}</span>`);
  $('bar-vp').title=`${me.name}: ${vp(S,me,true)} victory points${me.devVp?` (${me.devVp} hidden)`:''}`;
  setHTML($('me-line'),`<span class="me-name"><span class="dot" style="background:${me.color}"></span>${me.name}</span><span class="spacer"></span>
    <span class="me-stats num">${badges.length?`<span class="mybadge">${badges.join(' ')}</span>`:''}<span title="settlements left">${ico('house',13)} <b>${me.stock.sett}</b></span><span title="cities left">${ico('city',13)} <b>${me.stock.city}</b></span><span title="roads left">${ico('road',13)} <b>${me.stock.road}</b></span></span>`);

  // hand
  ensureHand();
  for(const c of $('hand').querySelectorAll('.rescard')){
    const r=c.dataset.r, n=me.res[r];
    c.querySelector('.ct').textContent=n;
    c.classList.toggle('zero',n===0);
    c.title=`${n} ${RES_META[r].label}`;
  }
  const dc=$('devcard'), nDev=me.dev.length+me.newdev.length;
  dc.querySelector('.ct').textContent=nDev;
  dc.classList.toggle('empty',nDev===0);
  dc.classList.toggle('ready',[...new Set(me.dev)].some(c=>devPlayable(me,c)));

  // build actions — a blocked one stays tappable and explains itself
  const setAct=(id,kind,m,stock)=>{
    const b=$(id); const reason=myTurn?buildReason(me,kind):"Not your turn.";
    b.classList.toggle("off",!!reason);
    b.classList.toggle("ready",!reason);
    b.classList.toggle("on",mode===m);
    b.dataset.reason=reason||"";
    let cost=costChips(COST[kind],me);
    if(kind==='road'&&S.freeRoads>0&&myTurn) cost='<span style="font-size:11px;color:var(--good)">Free</span>';
    if(kind==='dev'&&!S.devDeck.length) cost='<span style="font-size:10.5px;color:var(--faint)">Sold out</span>';
    setHTML(b.querySelector('.cost'),cost);
    let left=b.querySelector('.left');
    if(stock!=null){ if(!left){ left=el('span','left'); b.appendChild(left); } left.textContent=stock; left.title=`${stock} left`; }
  };
  setAct("act-road","road","road",me.stock.road);
  setAct("act-sett","sett","sett",me.stock.sett);
  setAct("act-city","city","city",me.stock.city);
  setAct("act-dev","dev","_dev",S.devDeck.length);
  const shipBtn=$("act-ship");
  if(shipBtn){ shipBtn.style.display=S.hasSea?"":"none"; if(S.hasSea) setAct("act-ship","ship","ship",me.stock.ship); }

  // one primary button: Roll → End turn
  const rollBtn=$('btn-roll'), endBtn=$('btn-end');
  const blocked=!!S.discardQueue.length||mode==='robber'||busy;
  const canBuildAny=['road','sett','city','dev'].some(k=>!buildReason(me,k))||[...new Set(me.dev)].some(c=>devPlayable(me,c));
  if(myTurn&&S.phase==='play'&&S.rolled){
    rollBtn.hidden=true; endBtn.hidden=false;
    endBtn.disabled=blocked;
    endBtn.classList.toggle('nudge',!blocked&&!canBuildAny&&!mode);
  } else {
    endBtn.hidden=true; rollBtn.hidden=false;
    const preRoll=myTurn&&S.phase==='play'&&!S.rolled;
    rollBtn.disabled=!preRoll||blocked;
    rollBtn.classList.toggle('wait',!preRoll);
    rollBtn.classList.toggle('nudge',preRoll&&!blocked);
    const label=busy?'Rolling…':preRoll?`${ico('die',18)} Roll dice`:S.phase==='setup'&&myTurn?'Founding':S.phase==='over'?'Game over':`${curP(S).name}…`;
    setHTML(rollBtn,label);
  }
  $('btn-trade').disabled=!(myTurn&&S.rolled&&S.phase==='play'&&mode!=='robber'&&!busy);
}
function renderDevPop(){
  const me=S.players[0], box=$('devpop');
  const groups={};
  me.dev.forEach(c=>groups[c]=(groups[c]||0)+1);
  me.newdev.forEach(c=>{groups[c]=(groups[c]||0)+1; groups['_new_'+c]=(groups['_new_'+c]||0)+1;});
  const keys=Object.keys(groups).filter(k=>!k.startsWith('_new_'));
  let html=`<div class="sec-lab">Development cards</div>`;
  if(!keys.length) html+=`<div class="dev-empty">No cards yet. Buy one with ${costChips(COST.dev,me)} from the build actions.</div>`;
  const usedNote=me.playedDevThisTurn?'<div class="dev-empty">You have played a card this turn.</div>':'';
  html+=keys.map(c=>{
    const n=groups[c], fresh=groups['_new_'+c]||0, playableN=n-fresh;
    const playable=devPlayable(me,c)&&playableN>0;
    const note=c==='vp'?'Worth 1 point, counted automatically':(playableN<=0&&fresh?'Ready next turn':DEV_META[c].desc);
    return `<button class="devchip${playable?' playable':''}" data-c="${c}" ${playable?'':'tabindex="-1"'}><span class="ic">${ico(DEV_ICO[c],20)}</span><span><span class="dlab">${DEV_META[c].label}${n>1?` ×${n}`:''}</span><span class="dnote">${note}</span></span>${playable?'<span class="play">Play</span>':''}</button>`;
  }).join('')+usedNote;
  setHTML(box,html);
  box.querySelectorAll('.devchip.playable').forEach(b=>b.onclick=()=>onPlayDev(b.dataset.c));
}

/* ------- 3D board: refresh + projected placement markers ------- */
function renderBoard(){
  boardRefresh();
  renderPick();
}
const spotTitle=vk=>{
  const v=S.board.V[vk];
  const parts=v.hexes.map(hid=>S.board.hexes[hid]).filter(h=>h.num).map(h=>`${RES_META[h.terrain]?.label||h.terrain} ${h.num}`);
  if(v.port) parts.push(v.port==='any'?'3:1 harbour':`2:1 ${RES_META[v.port].label} harbour`);
  return parts.join(' · ')||'No production';
};
function renderPick(){
  if(!board) return;
  const p=S?curP(S):null;
  if(!S||!p||p.bot||busy||S.phase==='over'){ board._pickSig=null; board.clearPick(); return; }
  const list=[];
  const pushV=(vk)=>{ const v=S.board.V[vk]; const w=toWorld(v.x,v.y); list.push({key:vk,wx:w[0],wz:w[1],wy:0.16,cls:'v',title:spotTitle(vk)}); };
  const pushE=(ek,cls)=>{ const e=S.board.E[ek]; const a=S.board.V[e.a],b=S.board.V[e.b]; const wa=toWorld(a.x,a.y),wb=toWorld(b.x,b.y); list.push({key:ek,wx:(wa[0]+wb[0])/2,wz:(wa[1]+wb[1])/2,wy:0.14,cls:cls||'e'}); };
  const pushH=(hid)=>{ const h=S.board.hexes[hid]; const w=toWorld(h.x,h.y); list.push({key:hid,wx:w[0],wz:w[1]+0.25,wy:0.1,cls:'h',title:h.num?`${RES_META[h.terrain]?.label||h.terrain} ${h.num}`:'Desert'}); };
  const sig=mode+'|'+S.board.robber+'|'+Object.values(S.board.V).filter(v=>v.bld).length+'|'+Object.values(S.board.E).filter(e=>e.road!=null||e.ship!=null).length+'|'+S.lastSetupSett;
  if(board._pickSig===sig&&board._pickEls&&board._pickEls.length) return;   // unchanged — keep markers (and their hover state)
  board._pickSig=sig;
  if(mode==='setup-sett'){ for(const vk of settSpots(S,p,true)) pushV(vk); board.setPick(list,vk=>onVertexTap(vk)); }
  else if(mode==='setup-road'){ for(const ek of roadSpots(S,p,S.lastSetupSett)) pushE(ek); board.setPick(list,ek=>onEdgeTap(ek)); }
  else if(mode==='sett'){ for(const vk of settSpots(S,p,false)) pushV(vk); board.setPick(list,vk=>onVertexTap(vk)); }
  else if(mode==='city'){ for(const vk of citySpots(S,p)) pushV(vk); board.setPick(list,vk=>onVertexTap(vk)); }
  else if(mode==='road'){ for(const ek of roadSpots(S,p,null)) pushE(ek); board.setPick(list,ek=>onEdgeTap(ek)); }
  else if(mode==='ship'){ for(const ek of shipSpots(S,p)) pushE(ek,'s'); board.setPick(list,ek=>onEdgeTap(ek)); }
  else if(mode==='robber'){ for(const h of S.board.hexes){ if(h.id!==S.board.robber) pushH(h.id); } board.setPick(list,hid=>onHexTap(hid)); }
  else { board._pickSig=null; board.clearPick(); }
}

function costDots(cost){
  let out='';
  for(const [r,n] of Object.entries(cost)) for(let i=0;i<n;i++) out+=`<i class="cdot" style="background:${RES_META[r].col}"></i>`;
  return out;
}

/* ---------------- keyboard ---------------- */
function initKeys(){
  document.addEventListener('keydown',e=>{
    if(e.target.matches&&e.target.matches('input,textarea,select')) return;
    if(e.metaKey||e.ctrlKey||e.altKey) return;
    const k=e.key.toLowerCase();
    if(k==='escape'){
      if(sheetOpen()){ if($('overlay').dataset.lock!=='1') closeSheet(); return; }
      if(screen!=='game') return;
      if(!$('gamemenu').hidden||!$('buildpop').hidden||!$('devpop').hidden){ closePops(); return; }
      if(CANCELLABLE.includes(mode)){ cancelMode(); return; }
      $('log').classList.remove('open');
      return;
    }
    if(screen!=='game'||sheetOpen()||!S) return;
    if(k===' '||k==='enter'){
      if(e.target.closest&&e.target.closest('button,a')) return;   // a focused control keeps its own Enter/Space
      e.preventDefault(); onPrimary();
    }
    else if(k==='r') onRoll();
    else if(k==='e') onEndTurn();
    else if(k==='t') openTrade();
    else if(k==='b') toggleBuild();
    else if(k==='d') toggleDev();
    else if(k==='1') toggleMode('road');
    else if(k==='2') toggleMode('sett');
    else if(k==='3') toggleMode('city');
    else if(k==='4') onBuyDev();
    else if(k==='5'&&S.hasSea) toggleMode('ship');
    else if(k==='f') togglePanels();
    else if(k==='c'&&board&&board.resetView) board.resetView();
  });
}

window.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-ico]').forEach(e=>{ e.innerHTML=ico(e.dataset.ico,e.classList.contains('iconbtn')?18:16); });
  document.querySelectorAll('[data-cost]').forEach(e=>{ e.innerHTML=costChips(COST[e.dataset.cost]); });
  $('btn-roll').onclick=onRoll;
  $('btn-end').onclick=onEndTurn;
  $('btn-trade').onclick=openTrade;
  $('act-road').onclick=()=>toggleMode('road');
  $('act-sett').onclick=()=>toggleMode('sett');
  $('act-city').onclick=()=>toggleMode('city');
  $('act-dev').onclick=onBuyDev;
  $('act-ship')&&($('act-ship').onclick=()=>toggleMode('ship'));
  boot();
});
