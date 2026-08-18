/* ================= HEXHAVEN UI ================= */
'use strict';

const $=id=>document.getElementById(id);
const el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};

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
const rdot=(r,n)=>`<span class="rd"><i style="background:${RES_META[r].col}"></i>${n>1?`<b class="num">${n}</b>`:''}</span>`;
const resIconHTML=(r,size=22)=>gico(r,size);
const SAVE_KEY='hexhaven-save-v1', SET_KEY='hexhaven-settings-v1';

const DEFAULT_SETTINGS={
  name:'You', colorIdx:0, bots:3, difficulty:'standard', target:10,
  layout:'spiral', friendlyRobber:false, botTrades:true, speed:'normal',
  expWild:false, mapSize:2, expSea:false,
};
let settings=loadSettings();
let S=null;            // game state
let mode=null;         // board interaction mode
let botTimer=null;
let pendingRoadFrom=null; // setup: vertex the road must attach to

function loadSettings(){
  try{ return {...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SET_KEY)||'{}')}; }
  catch(e){ return {...DEFAULT_SETTINGS}; }
}
function saveSettings(){ try{localStorage.setItem(SET_KEY,JSON.stringify(settings));}catch(e){} }
function saveGame(){ try{ if(S&&S.phase!=='over') localStorage.setItem(SAVE_KEY,JSON.stringify(S)); else localStorage.removeItem(SAVE_KEY);}catch(e){} }
function hasSave(){ try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;} }

const SPEEDS={relaxed:900,normal:520,fast:220};
const tick=()=>SPEEDS[S?.settings?.speed||settings.speed]||520;

/* ---------------- 3D board glue ---------------- */
const W_K=(0.5*1.02)/56;                 // engine px -> world units (matches hex-board)
const toWorld=(x,y)=>[x*W_K,y*W_K];
let board=null, pendingState=null;
let engineReady=false, boardReady=false, loadDone=false, panelsHidden=false;
let screen='loading';
let draft=null, fromMenuNew=true;
const flashRes=new Set();
let diceAnimate=false, lastLogLen=-1, idleTimer=null;

function attachBoard(b){
  board=b; boardReady=true;
  if(pendingState){ board.setState(pendingState); pendingState=null; }
  setLoad('board');
}
document.addEventListener('hex-board-ready',e=>attachBoard(e.detail));

function boardNewIsland(st){ if(board) board.setState(st); else pendingState=st; }
function boardRefresh(){ if(board) board.refresh(); }
function boardPulse(){ if(board&&S&&S.dice) board.pulse(S.dice[0]+S.dice[1]); }
function afterAnyRoll(){
  boardPulse(); diceAnimate=true; flashRes.clear();
  if(S.dice && S.dice[0]+S.dice[1]!==7){
    const g=S.lastGains&&S.lastGains[0];
    if(g) for(const r of RES) if(g[r]>0) flashRes.add(r);
  }
}

const MENU_VIEW=[420,60,-210], GAME_VIEW=[354,152,170];
function gameView(){
  const w=innerWidth,h=innerHeight;
  if(w>=820 && h>=520) return GAME_VIEW;
  if(w>h && h<=560) return [Math.min(250,Math.round(w*0.34)),30,120];  // landscape phone: side dock
  const collapsed=document.getElementById("dock")&&document.getElementById("dock").classList.contains("collapsed");
  return [0, 62 + Math.round(h*(collapsed?0.12:0.5)), 0];              // portrait: reserve header/strip + bottom sheet
}
function setDockCollapsed(on){ const d=$("dock"); if(!d)return; d.classList.toggle("collapsed",on); if(screen==="game") setView(panelsHidden?[0,0,0]:gameView()); }
function initDock(){
  const handle=$("dock-handle"); if(!handle) return;
  let sy=0,dy=0,active=false;
  handle.addEventListener("pointerdown",e=>{active=true;sy=e.clientY;dy=0;try{handle.setPointerCapture(e.pointerId);}catch(_){}}); 
  handle.addEventListener("pointermove",e=>{ if(active) dy=e.clientY-sy; });
  const end=()=>{ if(!active)return; active=false; if(dy>26) setDockCollapsed(true); else if(dy<-26) setDockCollapsed(false); else setDockCollapsed(!$("dock").classList.contains("collapsed")); };
  handle.addEventListener("pointerup",end); handle.addEventListener("pointercancel",end);
}
function menuView(){ return innerWidth<820 ? [0,0,0] : MENU_VIEW; }
function setView(v){ if(board) board.setPanels(v[0],v[1],v[2]); }

/* ---------------- screens ---------------- */
function show(name){
  screen=name;
  document.body.dataset.screen=name;
  if(name==='menu'){ setView(menuView()); refreshMenu(); }
  else if(name==='setup') setView(menuView());
  else if(name==='game') setView(panelsHidden?[0,0,0]:gameView());
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
  $('btn-continue').onclick=()=>{ try{ S=JSON.parse(localStorage.getItem(SAVE_KEY)); if(!S) return; boardNewIsland(S); startResume(); }catch(e){} };
  $('btn-settings').onclick=()=>showSetup(false);
  $('btn-rules').onclick=openRules;
  $('g-menu').onclick=()=>{ stopBots(); saveGame(); show('menu'); };
  $('btn-new-island').onclick=()=>{ showSetup(true); };
  $('btn-hide').onclick=togglePanels;
  $('setup-back').onclick=()=>show('menu');
  $('log').onclick=()=>$('log').classList.toggle('open');
  if(window.__hexBoard) attachBoard(window.__hexBoard);
  initDock();
  let rzT; window.addEventListener("resize",()=>{ clearTimeout(rzT); rzT=setTimeout(()=>{ if(screen==="game") setView(panelsHidden?[0,0,0]:gameView()); else if(screen==="menu"||screen==="setup") setView(menuView()); },160); });
  setLoad('engine');
}
function startResume(){
  panelsHidden=false; document.body.classList.remove('panels-hidden');
  $('first-to').textContent='First to '+S.settings.target+' points';
  show('game'); renderAll(); advance();
}
function refreshMenu(){ const has=hasSave(); $('btn-continue').disabled=!has; $('btn-continue').style.opacity=has?'1':'.4'; }

function togglePanels(){
  panelsHidden=!panelsHidden;
  document.body.classList.toggle('panels-hidden',panelsHidden);
  $('btn-hide').textContent=panelsHidden?'Show panels':'Hide panels';
  setView(panelsHidden?[0,0,0]:gameView());
}

/* ---------------- setup screen ---------------- */
function showSetup(fromNew){
  fromMenuNew=fromNew;
  draft={...settings};
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
    <div><div class="field-lab">Wild &amp; Wonders<small>Gold Field, volcano, oasis, jungle, swamp + trade post, ruins &amp; monument</small></div>${seg('expWild',[{v:false,l:'Off'},{v:true,l:'On'}],s.expWild)}</div>
    <div><div class="field-lab">Voyages<small>Splits the map into two islands — build ships across the sea (🌲+🐑)</small></div>${seg('expSea',[{v:false,l:'Off'},{v:true,l:'On'}],s.expSea)}</div>`;
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
function openSheet(html){ $('sheet').innerHTML=html; $('overlay').classList.add('on'); }
function closeSheet(){ $('overlay').classList.remove('on'); $('sheet').innerHTML=''; }
$('overlay')?.addEventListener?.('click',e=>{ if(e.target.id==='overlay'&&$('overlay').dataset.lock!=='1') closeSheet(); });

/* ---------------- settings sheet ---------------- */
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
      <li><b>Trade</b> — with the bank at 4:1, at harbors for 3:1 or 2:1, or haggle with rivals.</li>
      <li><b>Build</b> — roads (${costDots(COST.road)}), settlements (${costDots(COST.sett)}), cities (${costDots(COST.city)}), development cards (${costDots(COST.dev)}).</li></ul>
      <h3>The robber</h3>
      <p>Rolling <b>7</b> pays nothing. Anyone holding more than 7 cards discards half. The roller moves the robber to any tile — it blocks that tile's payouts — and steals one random card from a rival there.</p>
      <h3>Placement rules</h3>
      <ul><li>Settlements need an empty corner with <b>no neighbor buildings</b> (distance rule), connected to your roads.</li>
      <li>Roads chain off your own roads and buildings; they can't pass through a rival's building.</li></ul>
      <h3>Development cards</h3>
      <ul><li><b>${ico('sword',11)} Knight</b> — move the robber and steal. 3+ knights = Largest Army (2 VP).</li>
      <li><b>${ico('road',11)} Road Building</b> — 2 free roads. <b>${ico('gift',11)} Year of Plenty</b> — take any 2 cards. <b>${ico('coins',11)} Monopoly</b> — claim all of one resource. <b>${ico('rosette',11)} Victory Point</b> — hidden VP.</li>
      <li>One card per turn, never on the turn you bought it (VP cards excepted).</li></ul>
      <h3>Bonuses</h3>
      <p><b>Longest Road</b> (5+ connected) and <b>Largest Army</b> (3+ knights) are worth 2 VP each — and can be stolen.</p>
      <p style="margin-top:14px;font-size:11px;color:var(--faint)">Iconography from game-icons.net by Lorc, Delapouite &amp; Faithtoken (CC BY 3.0).</p>
    </div>
    <div class="sheet-actions"><button class="btn primary" onclick="closeSheet()">Got it</button></div>`);
}

/* ---------------- game start ---------------- */
function startGame(){
  stopBots();
  S=newGame({...settings});
  boardNewIsland(S);
  log(S,`A new island rises. First to <b>${S.settings.target} VP</b> wins.`,true);
  const first=S.players[S.setupQueue[0]];
  log(S,`<b>${first.name}</b> places first`,true);
  panelsHidden=false; document.body.classList.remove('panels-hidden');
  $('first-to').textContent='First to '+S.settings.target+' points';
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
      setTimeout(advance,tick()/2);
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
function queueBot(fn){ stopBots(); botTimer=setTimeout(fn,tick()); }
function stopBots(){ if(botTimer){clearTimeout(botTimer);botTimer=null;} }

/* ---------------- setup phase ---------------- */
function beginPlayerSetup(){
  if(S.setupStep==='sett'){
    mode='setup-sett';
    hint('Tap a corner to place your settlement');
  } else {
    mode='setup-road';
    hint('Tap an edge to place your road');
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
  placeSett(S,p,vk,true);
  S.lastSetupSett=vk;
  const round2=S.setupQueue.length<=S.players.length;
  if(round2) grantSetupResources(S,p,vk);
  S.setupStep='road';
  mode=null; renderAll();
  setTimeout(advance, p.bot?tick():0);
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
  setTimeout(advance, p.bot?tick():0);
}

/* ---------------- player turn ---------------- */
function beginPlayerTurn(){
  mode=null;
  if(S.goldPending>0){ openGoldChooser(S.goldPending); return; }
  hint(S.rolled?'Build, trade, or end your turn':'Roll the dice');
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
      b.innerHTML=`<span class="ic">${resIconHTML(r,24)}</span>${RES_META[r].label}${c?` ×${c}`:''}`;
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
    flashRes.clear(); for(const r of picks) flashRes.add(r);
    beginPlayerTurn();
  };
  refresh();
}
function onRoll(){
  if(S.phase!=='play'||curP(S).bot||S.rolled) return;
  animateDice();
  const r=rollDice(S); afterAnyRoll();
  renderAll();
  if(r.seven){ S.afterSeven=true; setTimeout(advance,tick()); }
  else { hint('Build, trade, or end your turn'); if(S.goldPending>0) openGoldChooser(S.goldPending); }
  saveGame();
}
function beginRobber(){
  const p=curP(S);
  if(p.bot){
    const hid=botRobberHex(S,p);
    const victims=moveRobber(S,hid);
    if(victims.length){ steal(S,botStealTarget(S,victims)); }
    renderAll();
    setTimeout(()=>{ afterRobber(); },tick());
  } else {
    mode='robber';
    hint('Move the robber: tap a tile');
    renderAll();
  }
}
function afterRobber(){
  const p=curP(S);
  if(!S.rolled&&S.phase==='play'){ // knight was played before rolling
    if(p.bot){ /* bot continues its turn in botTurn flow */ }
  }
  if(p.bot){ queueBot(()=>botTurn(true)); }
  else { mode=null; beginPlayerTurn(); }
}
function onHexTap(hid){
  if(mode!=='robber'||hid===S.board.robber) return;
  const victims=moveRobber(S,hid);
  mode=null; renderAll();
  if(victims.length===1){ steal(S,victims[0]); renderAll(); afterRobberPlayer(); }
  else if(victims.length>1) openStealPicker(victims);
  else afterRobberPlayer();
}
function afterRobberPlayer(){
  saveGame();
  if(!S.rolled) hint('Roll the dice');
  else hint('Build, trade, or end your turn');
  renderAll();
}
function openStealPicker(victims){
  $('overlay').dataset.lock='1';
  openSheet(`
    <h2>Steal from…</h2>
    <div class="sub">Pick a rival on that tile.</div>
    <div class="partner-list">${victims.map(i=>{
      const p=S.players[i];
      return `<button class="partner" data-i="${i}"><span class="dot" style="background:${p.color}"></span><b>${p.name}</b><span class="st num">${handSize(p)} cards</span></button>`;
    }).join('')}</div>`);
  $('sheet').querySelectorAll('.partner').forEach(b=>b.onclick=()=>{
    steal(S,+b.dataset.i);
    $('overlay').dataset.lock=''; closeSheet(); renderAll(); afterRobberPlayer();
  });
}

/* build modes */
function toggleMode(m){
  if(curP(S).bot) return;
  const ab=$("act-"+m);
  if(ab&&ab.classList.contains("off")){ hint(ab.dataset.reason||"Not available right now.",true); return; }
  if(!S.rolled) return;
  mode = mode===m?null:m;
  if(mode==='road') hint(S.freeRoads>0?`Free roads left: ${S.freeRoads} — tap an edge`:'Tap an edge to build a road');
  if(mode==='ship') hint('Tap a sea edge to set sail');
  if(mode==='sett') hint('Tap a highlighted corner to build a settlement');
  if(mode==='city') hint('Tap one of your settlements to upgrade');
  if(!mode) hint('Build, trade, or end your turn');
  renderAll();
}
function onVertexTap(vk){
  const p=curP(S);
  if(mode==='setup-sett'){ if(settSpots(S,p,true).includes(vk)) doSetupSett(p,vk); return; }
  if(mode==='sett'&&settSpots(S,p,false).includes(vk)&&canAfford(p,COST.sett)&&p.stock.sett>0){
    placeSett(S,p,vk,false); mode=null; renderAll(); winOrContinue();
  }
  if(mode==='city'&&citySpots(S,p).includes(vk)&&canAfford(p,COST.city)&&p.stock.city>0){
    placeCity(S,p,vk); mode=null; renderAll(); winOrContinue();
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
      if(!canAfford(p,COST.road)) mode=null;
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
  const p=curP(S);
  if(p.bot) return;
  const ab=$("act-dev");
  if(ab.classList.contains("off")){ hint(ab.dataset.reason||"Not available right now.",true); return; }
  if(!S.rolled||!canAfford(p,COST.dev)||!S.devDeck.length) return;
  const c=buyDev(S,p);
  hint(`You drew: ${DEV_META[c].label}`);
  renderAll(); winOrContinue();
}
function onPlayDev(card){
  const p=curP(S);
  if(p.bot||p.playedDevThisTurn||!p.dev.includes(card)||card==='vp') return;
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
function resChoiceGrid(id,multi){
  return `<div class="choice-grid" id="${id}">${RES.map(r=>`<button class="choice" data-r="${r}"><span class="ic">${resIconHTML(r,24)}</span>${RES_META[r].label}</button>`).join('')}</div>`;
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
      b.innerHTML=`<span class="ic">${resIconHTML(b.dataset.r,24)}</span>${RES_META[b.dataset.r].label}${n?` ×${n}`:''}`;
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
    $('overlay').dataset.lock=''; closeSheet(); renderAll(); winOrContinue();
  };
}
function openMonoPicker(p){
  $('overlay').dataset.lock='1';
  openSheet(`<h2>Monopoly</h2><div class="sub">Name a resource — every rival hands over all of theirs.</div>
    ${resChoiceGrid('mono')}<div class="sheet-actions">
    <button class="btn ghost" id="mono-cancel">Cancel</button></div>`);
  $('mono').querySelectorAll('.choice').forEach(b=>b.onclick=()=>{
    playDev(S,p,'mono'); monopoly(S,p,b.dataset.r);
    $('overlay').dataset.lock=''; closeSheet(); renderAll(); winOrContinue();
  });
  $('mono-cancel').onclick=()=>{ $('overlay').dataset.lock=''; closeSheet(); };
}

/* discard modal */
function openDiscard(p){
  $('overlay').dataset.lock='1';
  const need=Math.floor(handSize(p)/2);
  const sel={wood:0,brick:0,sheep:0,wheat:0,ore:0};
  openSheet(`<h2>Discard ${need} cards</h2><div class="sub">You're over the 7-card hand limit.</div>
    <div class="trade-grid give" id="dis"></div>
    <div class="sheet-actions"><button class="btn primary" id="dis-ok" disabled>Discard</button></div>`);
  const draw=()=>{
    $('dis').innerHTML=RES.filter(r=>p.res[r]>0).map(r=>`
      <div class="trow"><div class="rname"><span class="sw" style="background:${RES_META[r].col}"></span>${RES_META[r].label} <span class="num" style="color:var(--dim)">×${p.res[r]}</span></div>
      <div class="stepper"><button data-r="${r}" data-d="-1" ${sel[r]<=0?'disabled':''}>−</button><span class="v num">${sel[r]}</span><button data-r="${r}" data-d="1" ${sel[r]>=p.res[r]||sum(sel)>=need?'disabled':''}>+</button></div></div>`).join('');
    $('dis-ok').disabled=sum(sel)!==need;
    $('dis-ok').textContent=`Discard (${sum(sel)}/${need})`;
    $('dis').querySelectorAll('button').forEach(b=>b.onclick=()=>{ sel[b.dataset.r]+=+b.dataset.d; draw(); });
  };
  draw();
  $('dis-ok').onclick=()=>{
    discard(S,p,sel);
    $('overlay').dataset.lock=''; closeSheet(); renderAll();
    setTimeout(advance,100);
  };
}

/* ---------------- trade ---------------- */
function openTrade(){
  const p=curP(S);
  if(p.bot||!S.rolled) return;
  const give={wood:0,brick:0,sheep:0,wheat:0,ore:0}, get={wood:0,brick:0,sheep:0,wheat:0,ore:0};
  openSheet(`<h2>Trade</h2>
    <div class="sub rates">Bank rates: ${RES.map(r=>`<span class="rd" title="${RES_META[r].label}"><i style="background:${RES_META[r].col}"></i></span><span class="num">${rateFor(S,p,r)}:1</span>`).join(' ')}</div>
    <div class="trade-mid">You give</div><div class="trade-grid give" id="tg"></div>
    <div class="trade-mid">You get</div><div class="trade-grid get" id="tr"></div>
    <div class="sheet-actions">
      <button class="btn" id="t-bank" disabled>Bank</button>
      <button class="btn" id="t-players" disabled ${S.players.length<2?'style="display:none"':''}>Offer rivals</button>
      <button class="btn ghost" id="t-close">Close</button>
    </div>`);
  const row=(side,obj,max)=>RES.map(r=>`
    <div class="trow"><div class="rname"><span class="sw" style="background:${RES_META[r].col}"></span>${RES_META[r].label}${side==='g'?` <span class="num" style="color:var(--dim)">×${p.res[r]}</span>`:''}</div>
    <div class="stepper"><button data-s="${side}" data-r="${r}" data-d="-1" ${obj[r]<=0?'disabled':''}>−</button><span class="v num">${obj[r]}</span><button data-s="${side}" data-r="${r}" data-d="1" ${side==='g'&&obj[r]>=p.res[r]?'disabled':''}${side==='r'&&obj[r]>=S.bank[r]?'disabled':''}>+</button></div></div>`).join('');
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
  const draw=()=>{
    $('tg').innerHTML=row('g',give);
    $('tr').innerHTML=row('r',get);
    $('t-bank').disabled=!bankValid();
    $('t-players').disabled=!offerValid();
    $('sheet').querySelectorAll('.stepper button').forEach(b=>b.onclick=()=>{
      const o=b.dataset.s==='g'?give:get;
      o[b.dataset.r]=Math.max(0,o[b.dataset.r]+ +b.dataset.d);
      draw();
    });
  };
  draw();
  $('t-close').onclick=closeSheet;
  $('t-bank').onclick=()=>{
    for(const r of RES){ p.res[r]-=give[r]; S.bank[r]+=give[r]; }
    for(const r of RES){ S.bank[r]-=get[r]; p.res[r]+=get[r]; }
    log(S,`<b>${p.name}</b> traded with the bank`);
    closeSheet(); renderAll(); saveGame();
  };
  $('t-players').onclick=()=>{
    const bots=S.players.filter(o=>o.bot);
    const answers=bots.map(b=>({p:b,yes:botEvaluateOffer(S,b,give,get)}));
    openSheet(`<h2>Your offer</h2>
      <div class="sub">Give ${fmtBundle(give)} for ${fmtBundle(get)}</div>
      <div class="partner-list">${answers.map(a=>`
        <button class="partner" data-i="${a.p.i}" ${a.yes?'':'disabled style="opacity:.45"'}>
          <span class="dot" style="background:${a.p.color}"></span><b>${a.p.name}</b>
          <span class="st" style="color:${a.yes?'var(--good)':'var(--bad)'}">${a.yes?'Accepts':'Declines'}</span>
        </button>`).join('')}</div>
      <div class="sheet-actions"><button class="btn ghost" id="t-back">Never mind</button></div>`);
    $('t-back').onclick=closeSheet;
    $('sheet').querySelectorAll('.partner:not([disabled])').forEach(b=>b.onclick=()=>{
      playerTrade(S,p,S.players[+b.dataset.i],give,get);
      closeSheet(); renderAll(); saveGame();
    });
  };
}
function fmtBundle(o){
  const parts=RES.filter(r=>o[r]>0).map(r=>`<b class="num">${o[r]}</b> ${RES_META[r].label}`);
  return parts.join(' + ')||'nothing';
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
    <div class="sheet-actions">
      <button class="btn ghost" id="bo-no">Decline</button>
      <button class="btn primary" id="bo-yes">Accept</button>
    </div>`);
  $('overlay').dataset.lock='1';
  const finish=()=>{ $('overlay').dataset.lock=''; closeSheet(); renderAll(); done(); };
  $('bo-no').onclick=finish;
  $('bo-yes').onclick=()=>{ playerTrade(S,bot,human,give,get); finish(); };
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
    animateDice();
    const r=rollDice(S); afterAnyRoll();
    renderAll();
    if(r.seven){ S.afterSeven=true; setTimeout(advance,tick()); return; }
    queueBot(()=>botTurn(true));
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
    if(dv==='mono'){ playDev(S,p,'mono'); monopoly(S,p,botMonopolyPick(S,p)); renderAll(); queueBot(()=>botTurn(true)); return; }
  }

  // build/trade steps
  const act=botStep(S,p);
  if(act){
    renderAll();
    if(checkWin(S)){ showGameOver(); return; }
    queueBot(()=>botTurn(true));
    return;
  }

  // maybe pitch the human a trade, then end turn
  const maybeOffer = S.settings.botTrades && Math.random()<0.3 && handSize(S.players[0])>0;
  const finish=()=>{
    endTurn(S);
    renderAll(); saveGame();
    setTimeout(advance,tick()/2);
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
  const p=curP(S);
  if(p.bot||!S.rolled) return;
  if(checkWin(S)){ showGameOver(); return; }
  mode=null; S.freeRoads=0;
  endTurn(S);
  renderAll(); saveGame();
  setTimeout(advance,100);
}
function showGameOver(){
  stopBots(); saveGame();
  const w=S.players[S.winner];
  const rows=S.players.slice().sort((a,b)=>vp(S,b,true)-vp(S,a,true)).map(p=>{
    const bits=[];
    if(S.longestRoad.owner===p.i) bits.push(ico('road',11)+' Longest Road');
    if(S.largestArmy.owner===p.i) bits.push(ico('sword',11)+' Largest Army');
    if(p.devVp) bits.push(ico('rosette',11)+` ×${p.devVp}`);
    return `<div class="srow"><span class="dot" style="background:${p.color}"></span>
      <div><b>${p.name}</b><div style="font-size:11.5px;color:var(--dim)">${bits.join(' · ')||'&nbsp;'}</div></div>
      <span class="pts num">${vp(S,p,true)} VP</span></div>`;
  }).join('');
  $('overlay').dataset.lock='1';
  openSheet(`<div class="finale">
      <div style="color:var(--brass)">${ico(w.bot?'flag':'crown',44)}</div>
      <div class="fbig">${w.bot?`${w.name} wins`:'Victory!'}</div>
      <div class="sub">${w.bot?'The island falls to a rival.':'The island is yours.'}</div>
      <div class="standings">${rows}</div>
      <div class="sheet-actions">
        <button class="btn ghost" id="go-menu">Menu</button>
        <button class="btn primary" id="go-again">Play again</button>
      </div></div>`);
  $('go-menu').onclick=()=>{ $('overlay').dataset.lock=''; closeSheet(); show('menu'); refreshMenu(); };
  $('go-again').onclick=()=>{ $('overlay').dataset.lock=''; closeSheet(); startGame(); };
}

/* ---------------- rendering ---------------- */
function hint(msg,warn){ const h=$('hint'); h.textContent=msg; h.classList.remove('hide','shake'); h.classList.toggle('warn',!!warn); if(warn){ void h.offsetWidth; h.classList.add('shake'); } }

function animateDice(){
  $('dicebox').querySelectorAll('.die').forEach(d=>{ d.classList.remove('rolling'); void d.offsetWidth; d.classList.add('rolling'); });
}

function renderAll(){
  if(!S) return;
  renderBoard(); renderOpponents(); renderDock(); renderLog(); renderDice(); renderFlag();
}
function renderFlag(){
  const p=curP(S);
  const state=S.phase==='setup'?'founding':(p.bot?'thinking':'your turn');
  $('turnflag').innerHTML=`<span class="dot" style="background:${p.color}"></span><span class="nm">${p.bot?p.name:'You'}</span><span class="st">${state}</span>`;
}
const PIP_POS={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
function dieFace(n){
  const dots=PIP_POS[n].map(([x,y])=>`<circle cx="${x*5.5}" cy="${y*5.5}" r="2.1" fill="#1c2431"/>`).join('');
  return `<div class="die"><svg viewBox="-11 -11 22 22" width="26" height="26">${dots}</svg></div>`;
}
function renderDice(){
  const box=$('dicebox');
  if(!S.dice){ box.innerHTML=''; return; }
  box.innerHTML=S.dice.map(dieFace).join('')+`<span class="dtotal num">${S.dice[0]+S.dice[1]}</span>`;
  if(diceAnimate){ box.querySelectorAll('.die').forEach(d=>{ void d.offsetWidth; d.classList.add('rolling'); }); diceAnimate=false; }
}
function renderLog(){
  const box=$('log');
  box.innerHTML=S.log.slice().reverse().slice(0,40).map(l=>`<div class="l ${l.sys?'sys':''}">${l.msg}</div>`).join('');
  if(S.log.length!==lastLogLen){
    lastLogLen=S.log.length;
    box.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer=setTimeout(()=>box.classList.add('idle'),4200);
  }
}
function renderOpponents(){
  const box=$('opponents'); box.innerHTML='';
  for(const p of S.players){
    if(!p.bot) continue;
    const d=el('div','rival'+(curP(S).i===p.i?' active':''));
    d.style.setProperty('--pc',p.color);
    const badges=[];
    if(S.longestRoad.owner===p.i) badges.push(ico('road',11));
    if(S.largestArmy.owner===p.i) badges.push(ico('sword',11));
    d.innerHTML=`
      <div class="rtop"><span class="dot" style="background:${p.color}"></span><span class="name">${p.name}</span><span class="vp num">${vp(S,p,false)}</span></div>
      <div class="meta num"><span title="cards">${ico('card',12)} <b>${handSize(p)}</b></span><span title="dev cards">${ico('scroll',12)} <b>${p.dev.length+p.newdev.length}</b></span><span title="knights">${ico('sword',12)} <b>${p.knights}</b></span><span title="road">${ico('road',12)} <b>${p.roadLen||0}</b></span>${badges.length?`<span class="rbadge">${badges.join('')}</span>`:''}</div>`;
    box.appendChild(d);
  }
}

function needMsg(me,cost){
  const miss=RES.filter(r=>me.res[r]<(cost[r]||0)).map(r=>`${cost[r]-me.res[r]} ${RES_META[r].label}`);
  return miss.length?`Need ${miss.join(" + ")}.`:null;
}
// returns null when the action is available, else a short reason string
function buildReason(me,kind){
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
function renderDock(){
  const me=S.players[0];
  const myTurn=curP(S).i===0;
  $('dock').classList.toggle('active',myTurn);
  const badges=[];
  if(S.longestRoad.owner===0) badges.push(ico('road',12)+' Longest Road');
  if(S.largestArmy.owner===0) badges.push(ico('sword',12)+' Largest Army');
  $('me-line').innerHTML=`
    <span class="me-name"><span class="dot" style="background:${me.color}"></span>${me.name}</span>
    <span class="spacer"></span>
    <span class="me-stats num">${badges.length?`<span class="mybadge">${badges.join(' · ')}</span>`:''}<span title="settlements left">${ico('house',13)} <b>${me.stock.sett}</b></span><span title="cities left">${ico('city',13)} <b>${me.stock.city}</b></span><span title="roads left">${ico('road',13)} <b>${me.stock.road}</b></span></span>
    <span class="me-vp num">${vp(S,me,true)} VP</span>`;

  // hand
  const hand=$('hand'); hand.innerHTML='';
  RES.forEach((r,idx)=>{
    const c=el('div','rescard'+(me.res[r]===0?' zero':'')+(flashRes.has(r)?' bump':''));
    c.style.setProperty('--rc',RES_META[r].col);
    c.style.animationDelay=(idx*60)+'ms';
    c.innerHTML=`<span class="ic">${resIconHTML(r,24)}</span><span class="ct num">${me.res[r]}</span><span class="lb">${RES_META[r].label}</span>`;
    hand.appendChild(c);
  });
  flashRes.clear();

  // dev section
  let dw=$('devwrap');
  if(!dw){ dw=el('div','devwrap'); dw.id='devwrap'; hand.after(dw); }
  const groups={};
  me.dev.forEach(c=>groups[c]=(groups[c]||0)+1);
  me.newdev.forEach(c=>{groups[c]=(groups[c]||0)+1; groups['_new_'+c]=(groups['_new_'+c]||0)+1;});
  const keys=Object.keys(groups).filter(k=>!k.startsWith('_new_'));
  dw.innerHTML=`<div class="sec-lab">Development</div>`+(keys.length?'':`<div class="dev-empty">No cards in hand.</div>`);
  for(const c of keys){
    const n=groups[c], fresh=groups['_new_'+c]||0, playableN=n-fresh;
    const playable=myTurn&&!me.playedDevThisTurn&&c!=='vp'&&playableN>0&&(S.rolled||c==='knight')&&S.phase==='play'&&!S.discardQueue.length&&mode!=='robber';
    const note=c==='vp'?'Worth 1 point':(playableN<=0&&fresh?'Ready next turn':DEV_META[c].desc);
    const d=el('button','devchip'+(playable?' playable':''));
    d.innerHTML=`<span class="ic">${ico(DEV_ICO[c],17)}</span><span><span class="dlab">${DEV_META[c].label}${n>1?` ×${n}`:''}</span><span class="dnote">${note}</span></span>`;
    if(playable) d.onclick=()=>onPlayDev(c);
    dw.appendChild(d);
  }

  // build + footer — a blocked action stays tappable and explains itself
  const setAct=(id,m,reason)=>{ const b=$(id); b.classList.toggle("off",!!reason); b.classList.toggle("on",mode===m); b.dataset.reason=reason||""; };
  setAct("act-road","road",myTurn?buildReason(me,"road"):"Not your turn.");
  setAct("act-sett","sett",myTurn?buildReason(me,"sett"):"Not your turn.");
  setAct("act-city","city",myTurn?buildReason(me,"city"):"Not your turn.");
  setAct("act-dev","_dev",myTurn?buildReason(me,"dev"):"Not your turn.");
  $("act-dev").querySelector(".cost").innerHTML=S.devDeck.length?costDots(COST.dev):'<span style="color:var(--faint)">Sold out</span>';
  const shipBtn=$("act-ship");
  if(shipBtn){ shipBtn.style.display=S.hasSea?"":"none"; if(S.hasSea) setAct("act-ship","ship",myTurn?buildReason(me,"ship"):"Not your turn."); }

  const preRoll=myTurn&&S.phase==='play'&&!S.rolled;
  const rollBtn=$('btn-roll');
  rollBtn.disabled=!(preRoll&&!S.discardQueue.length&&mode!=='robber');
  rollBtn.innerHTML=S.rolled?`Rolled ${S.dice?S.dice[0]+S.dice[1]:''}`:`${ico('die',18)} Roll dice`;
  $('btn-trade').disabled=!(myTurn&&S.rolled&&S.phase==='play'&&mode!=='robber');
  $('btn-end').disabled=!(myTurn&&S.rolled&&S.phase==='play'&&mode!=='robber'&&!S.discardQueue.length);
}

/* ------- 3D board: refresh + projected placement markers ------- */
function renderBoard(){
  boardRefresh();
  renderPick();
}
function renderPick(){
  if(!board) return;
  const p=S?curP(S):null;
  if(!S||!p||p.bot){ board.clearPick(); return; }
  const list=[];
  const pushV=(vk)=>{ const v=S.board.V[vk]; const w=toWorld(v.x,v.y); list.push({key:vk,wx:w[0],wz:w[1],wy:0.16,cls:'v'}); };
  const pushE=(ek,cls)=>{ const e=S.board.E[ek]; const a=S.board.V[e.a],b=S.board.V[e.b]; const wa=toWorld(a.x,a.y),wb=toWorld(b.x,b.y); list.push({key:ek,wx:(wa[0]+wb[0])/2,wz:(wa[1]+wb[1])/2,wy:0.14,cls:cls||'e'}); };
  const pushH=(hid)=>{ const h=S.board.hexes[hid]; const w=toWorld(h.x,h.y); list.push({key:hid,wx:w[0],wz:w[1],wy:0.32,cls:'h'}); };
  if(mode==='setup-sett'){ for(const vk of settSpots(S,p,true)) pushV(vk); board.setPick(list,vk=>onVertexTap(vk)); }
  else if(mode==='setup-road'){ for(const ek of roadSpots(S,p,S.lastSetupSett)) pushE(ek); board.setPick(list,ek=>onEdgeTap(ek)); }
  else if(mode==='sett'){ for(const vk of settSpots(S,p,false)) pushV(vk); board.setPick(list,vk=>onVertexTap(vk)); }
  else if(mode==='city'){ for(const vk of citySpots(S,p)) pushV(vk); board.setPick(list,vk=>onVertexTap(vk)); }
  else if(mode==='road'){ for(const ek of roadSpots(S,p,null)) pushE(ek); board.setPick(list,ek=>onEdgeTap(ek)); }
  else if(mode==='ship'){ for(const ek of shipSpots(S,p)) pushE(ek,'s'); board.setPick(list,ek=>onEdgeTap(ek)); }
  else if(mode==='robber'){ for(const h of S.board.hexes){ if(h.id!==S.board.robber) pushH(h.id); } board.setPick(list,hid=>onHexTap(hid)); }
  else board.clearPick();
}

function costDots(cost){
  let out='';
  for(const [r,n] of Object.entries(cost)) for(let i=0;i<n;i++) out+=`<i class="cdot" style="background:${RES_META[r].col}"></i>`;
  return out;
}
window.addEventListener('DOMContentLoaded',()=>{
  document.querySelectorAll('[data-ico]').forEach(e=>{ e.innerHTML=ico(e.dataset.ico,e.classList.contains('iconbtn')?17:15); });
  document.querySelectorAll('[data-cost]').forEach(e=>{ e.innerHTML=costDots(COST[e.dataset.cost]); });
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
