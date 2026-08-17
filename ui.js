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

/* ---------------- screens ---------------- */
function show(screen){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  $(screen).classList.add('on');
}
function boot(){
  $('btn-new').onclick=()=>openSettings(true);
  $('btn-continue').onclick=()=>{ try{ S=JSON.parse(localStorage.getItem(SAVE_KEY)); show('game'); renderAll(); advance(); }catch(e){} };
  $('btn-settings').onclick=()=>openSettings(false);
  $('btn-rules').onclick=openRules;
  $('g-settings').onclick=()=>openSettings(false);
  $('g-menu').onclick=()=>{ stopBots(); saveGame(); show('menu'); refreshMenu(); };
  refreshMenu();
  show('menu');
}
function refreshMenu(){ $('btn-continue').disabled=!hasSave(); }

/* ---------------- modal helpers ---------------- */
function openSheet(html){ $('sheet').innerHTML=html; $('overlay').classList.add('on'); }
function closeSheet(){ $('overlay').classList.remove('on'); $('sheet').innerHTML=''; }
$('overlay')?.addEventListener?.('click',e=>{ if(e.target.id==='overlay'&&$('overlay').dataset.lock!=='1') closeSheet(); });

/* ---------------- settings sheet ---------------- */
function seg(name,opts,val){
  return `<div class="seg" data-seg="${name}">${opts.map(o=>`<button data-v="${o.v}" class="${String(o.v)===String(val)?'on':''}">${o.l}</button>`).join('')}</div>`;
}
function openSettings(startAfter){
  const s={...settings};
  openSheet(`
    <h2>Game settings</h2>
    <div class="sub">${startAfter?'Set up your table, then deal in.':'Changes apply to the next new game.'}</div>
    <div class="set-row"><div class="lab">Your name</div><input type="text" id="set-name" maxlength="14" value="${s.name.replace(/"/g,'&quot;')}"></div>
    <div class="set-row"><div class="lab">Your color</div><div class="swatches" id="set-colors">${PLAYER_COLORS.map((c,i)=>`<button class="swatch ${i===s.colorIdx?'on':''}" data-i="${i}" style="background:${c.hex}" aria-label="${c.id}"></button>`).join('')}</div></div>
    <div class="set-row"><div class="lab">Rivals<small>Bot opponents at the table</small></div>${seg('bots',[{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}],s.bots)}</div>
    <div class="set-row"><div class="lab">Bot skill</div>${seg('difficulty',[{v:'casual',l:'Casual'},{v:'standard',l:'Standard'},{v:'cutthroat',l:'Cutthroat'}],s.difficulty)}</div>
    <div class="set-row"><div class="lab">Victory points to win</div>${seg('target',[{v:8,l:'8'},{v:10,l:'10'},{v:12,l:'12'}],s.target)}</div>
    <div class="set-row"><div class="lab">Island layout<small>Spiral = classic numbering, no hot spots touching</small></div>${seg('layout',[{v:'spiral',l:'Spiral'},{v:'balanced',l:'Balanced'},{v:'random',l:'Chaos'}],s.layout)}</div>
    <div class="set-row"><div class="lab">Friendly robber<small>No stealing from players under 3 VP</small></div>${seg('friendlyRobber',[{v:false,l:'Off'},{v:true,l:'On'}],s.friendlyRobber)}</div>
    <div class="set-row"><div class="lab">Bots may offer you trades</div>${seg('botTrades',[{v:false,l:'Off'},{v:true,l:'On'}],s.botTrades)}</div>
    <div class="set-row"><div class="lab">Bot pace</div>${seg('speed',[{v:'relaxed',l:'Relaxed'},{v:'normal',l:'Normal'},{v:'fast',l:'Fast'}],s.speed)}</div>
    <div class="sheet-actions">
      <button class="btn ghost" id="set-cancel">Cancel</button>
      <button class="btn primary" id="set-ok">${startAfter?'Start game':'Save'}</button>
    </div>`);
  $('sheet').querySelectorAll('[data-seg]').forEach(g=>{
    g.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      g.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      b.classList.add('on');
      const raw=b.dataset.v;
      s[g.dataset.seg]= raw==='true'?true: raw==='false'?false: isNaN(+raw)?raw:+raw;
    });
  });
  $('set-colors').querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{
    $('set-colors').querySelectorAll('.swatch').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); s.colorIdx=+b.dataset.i;
  });
  $('set-cancel').onclick=closeSheet;
  $('set-ok').onclick=()=>{
    s.name=$('set-name').value.trim()||'You';
    settings=s; saveSettings(); closeSheet();
    if(startAfter) startGame();
  };
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
  log(S,`A new island rises. First to <b>${S.settings.target} VP</b> wins.`,true);
  const first=S.players[S.setupQueue[0]];
  log(S,`<b>${first.name}</b> places first`,true);
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
  hint(S.rolled?'Build, trade, or end your turn':'Roll the dice');
  renderAll();
}
function onRoll(){
  if(S.phase!=='play'||curP(S).bot||S.rolled) return;
  animateDice();
  const r=rollDice(S);
  renderAll();
  if(r.seven){ S.afterSeven=true; setTimeout(advance,tick()); }
  else hint('Build, trade, or end your turn');
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
  if(curP(S).bot||!S.rolled) return;
  mode = mode===m?null:m;
  if(mode==='road') hint(S.freeRoads>0?`Free roads left: ${S.freeRoads} — tap an edge`:'Tap an edge to build a road');
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
  if(p.bot||!S.rolled||!canAfford(p,COST.dev)||!S.devDeck.length) return;
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
    const r=rollDice(S);
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
function hint(msg){ const h=$('hint'); h.textContent=msg; h.classList.remove('hide'); }

function animateDice(){
  $('dicebox').querySelectorAll('.die').forEach(d=>{ d.classList.remove('rolling'); void d.offsetWidth; d.classList.add('rolling'); });
}

function renderAll(){
  if(!S) return;
  renderBoard(); renderOpponents(); renderDock(); renderLog(); renderDice(); renderFlag();
}
function renderFlag(){
  const p=curP(S);
  $('turnflag').innerHTML=`<span class="dot" style="background:${p.color}"></span><span>${S.phase==='setup'?'Founding: ':''}${p.bot?p.name:'Your turn'}</span>`;
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
}
function renderLog(){
  $('log').innerHTML=S.log.slice().reverse().map(l=>`<div class="l ${l.sys?'sys':''}">${l.msg}</div>`).join('');
}
function renderOpponents(){
  const box=$('opponents');
  box.innerHTML='';
  for(const p of S.players){
    if(!p.bot) continue;
    const active=curP(S).i===p.i;
    const d=el('div','opp'+(active?' active':''));
    const badges=[];
    if(S.longestRoad.owner===p.i) badges.push(ico('road',11));
    if(S.largestArmy.owner===p.i) badges.push(ico('sword',11));
    d.innerHTML=`
      ${badges.length?`<span class="badge">${badges.join('')}</span>`:''}
      <div class="who"><span class="dot" style="background:${p.color}"></span><span class="name">${p.name}</span><span class="vp num">${vp(S,p,false)}</span></div>
      <div class="meta num"><span title="resource cards">${ico('card',12)} <b>${handSize(p)}</b></span><span title="development cards">${ico('scroll',12)} <b>${p.dev.length+p.newdev.length}</b></span><span title="knights played">${ico('sword',12)} <b>${p.knights}</b></span><span title="longest road">${ico('road',12)} <b>${p.roadLen||0}</b></span></div>`;
    box.appendChild(d);
  }
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
    <span class="me-vp num">${vp(S,me,true)} VP</span>
    <span class="spacer"></span>
    <span class="me-stats num">${badges.length?`<span class="mybadge">${badges.join(' · ')}</span>`:''}<span title="settlements left">${ico('house',13)} <b>${me.stock.sett}</b></span><span title="cities left">${ico('city',13)} <b>${me.stock.city}</b></span><span title="roads left">${ico('road',13)} <b>${me.stock.road}</b></span></span>`;

  // hand
  const hand=$('hand');
  hand.innerHTML='';
  for(const r of RES){
    const c=el('div','rescard'+(me.res[r]===0?' zero':''));
    c.style.background=RES_META[r].col;
    c.innerHTML=`<span class="ic">${resIconHTML(r,22)}</span><span class="ct num">${me.res[r]}</span><span class="lb">${RES_META[r].label}</span>`;
    hand.appendChild(c);
  }
  // dev cards
  const groups={};
  me.dev.forEach(c=>groups[c]=(groups[c]||0)+1);
  me.newdev.forEach(c=>{groups[c]=(groups[c]||0)+1; groups['_new_'+c]=(groups['_new_'+c]||0)+1;});
  for(const [c,n] of Object.entries(groups)){
    if(c.startsWith('_new_')) continue;
    const fresh=groups['_new_'+c]||0;
    const playableN=n-fresh;
    const playable=myTurn&&!me.playedDevThisTurn&&c!=='vp'&&playableN>0&&(S.rolled||c==='knight')&&S.phase==='play'&&!S.discardQueue.length&&mode!=='robber';
    const d=el('button','devchip'+(playable?' playable':''));
    d.innerHTML=`<span class="ic">${ico(DEV_ICO[c],17)}</span><div class="lb">${DEV_META[c].label}${n>1?` ×${n}`:''}</div>`;
    d.title=DEV_META[c].desc+(fresh?` (${fresh} new this turn)`:'');
    if(playable) d.onclick=()=>onPlayDev(c);
    hand.appendChild(d);
  }

  // actions
  const can=(cost)=>myTurn&&S.rolled&&S.phase==='play'&&canAfford(me,cost)&&!S.discardQueue.length&&mode!=='robber';
  const setBtn=(id,on,enabled)=>{ const b=$(id); b.disabled=!enabled; b.classList.toggle('on',mode===on); };
  setBtn('act-road','road',(can(COST.road)||S.freeRoads>0&&myTurn)&&me.stock.road>0&&roadSpots(S,me,null).length>0);
  setBtn('act-sett','sett',can(COST.sett)&&me.stock.sett>0&&settSpots(S,me,false).length>0);
  setBtn('act-city','city',can(COST.city)&&me.stock.city>0&&citySpots(S,me).length>0);
  $('act-dev').disabled=!(can(COST.dev)&&S.devDeck.length>0);
  $('act-dev').querySelector('.cost').innerHTML=S.devDeck.length?`${costDots(COST.dev)} · <span class="num">${S.devDeck.length}</span>`:'sold out';

  $('btn-roll').style.display=(myTurn&&S.phase==='play'&&!S.rolled)?'':'none';
  $('btn-roll').disabled=!(myTurn&&S.phase==='play'&&!S.rolled&&!S.discardQueue.length&&mode!=='robber');
  $('btn-trade').disabled=!(myTurn&&S.rolled&&S.phase==='play'&&mode!=='robber');
  $('btn-end').disabled=!(myTurn&&S.rolled&&S.phase==='play'&&mode!=='robber'&&!S.discardQueue.length);
}

/* ------- board svg ------- */
const SVG_NS='http://www.w3.org/2000/svg';
function svg(tag,attrs){ const e=document.createElementNS(SVG_NS,tag); for(const [k,v] of Object.entries(attrs||{})) e.setAttribute(k,v); return e; }

/* terrain artwork — one glyph fn per terrain, drawn small and repeated */
const ART={
  wood(g){
    g.appendChild(svg('path',{d:'M0 -11 L7 0 L3.5 0 L8 7 L2 7 L2 11 L-2 11 L-2 7 L-8 7 L-3.5 0 L-7 0 Z',
      fill:'#1d4630',stroke:'#12331f','stroke-width':.8}));
  },
  brick(g){
    const b=(x,y)=>g.appendChild(svg('rect',{x,y,width:9,height:5,rx:.8,fill:'#8f452c',stroke:'#6f351f','stroke-width':.8}));
    b(-10,-6); b(0.5,-6); b(-4.75,0);
  },
  sheep(g){
    g.appendChild(svg('line',{x1:-3.5,y1:3,x2:-3.5,y2:7,stroke:'#39424f','stroke-width':1.6}));
    g.appendChild(svg('line',{x1:3.5,y1:3,x2:3.5,y2:7,stroke:'#39424f','stroke-width':1.6}));
    g.appendChild(svg('ellipse',{cx:0,cy:0,rx:7,ry:4.6,fill:'#f5f2e6',stroke:'#c9c2ac','stroke-width':.8}));
    g.appendChild(svg('circle',{cx:6.8,cy:-2.2,r:2.7,fill:'#39424f'}));
  },
  wheat(g){
    for(const [dx,rot] of [[-6,-14],[0,0],[6,14]]){
      const s=svg('g',{transform:`translate(${dx},0) rotate(${rot})`});
      s.appendChild(svg('line',{x1:0,y1:10,x2:0,y2:-9,stroke:'#8a660f','stroke-width':1.6}));
      for(let y=-8;y<=0;y+=3){
        s.appendChild(svg('line',{x1:0,y1:y,x2:-3.4,y2:y-2.6,stroke:'#8a660f','stroke-width':1.5}));
        s.appendChild(svg('line',{x1:0,y1:y,x2:3.4,y2:y-2.6,stroke:'#8a660f','stroke-width':1.5}));
      }
      g.appendChild(s);
    }
  },
  ore(g){
    g.appendChild(svg('path',{d:'M-11 7 L-3.5 -8 L1 0 L6 -5.5 L11 7 Z',fill:'#4c586e',stroke:'#39445a','stroke-width':.8}));
    g.appendChild(svg('path',{d:'M-3.5 -8 L-1.4 -3.8 L-5.6 -3.8 Z',fill:'#dfe6ef'}));
    g.appendChild(svg('path',{d:'M6 -5.5 L7.4 -2.6 L4.6 -2.6 Z',fill:'#dfe6ef'}));
  },
  desert(g){
    g.appendChild(svg('path',{d:'M-11 3 Q-4 -4 3 3',fill:'none',stroke:'#a88d5d','stroke-width':2,'stroke-linecap':'round'}));
    g.appendChild(svg('path',{d:'M-2 9 Q5 2 12 9',fill:'none',stroke:'#a88d5d','stroke-width':2,'stroke-linecap':'round'}));
  },
};
function addTerrainArt(parent,h){
  const fn=ART[h.terrain==='desert'?'desert':h.terrain];
  if(!fn) return;
  const spots=h.terrain==='desert'
    ? [[0,-30,1],[-24,16,.9],[24,16,.9]]
    : [[0,-31,1],[-26,15,.92],[26,15,.92]];
  for(const [dx,dy,sc] of spots){
    const g=svg('g',{transform:`translate(${h.x+dx},${h.y+dy}) scale(${sc})`,opacity:.85});
    fn(g); parent.appendChild(g);
  }
}

function renderBoard(){
  const b=S.board, root=$('board');
  root.innerHTML='';
  const xs=b.hexes.map(h=>h.x), ys=b.hexes.map(h=>h.y);
  const pad=HEX_SIZE*1.95;
  const minX=Math.min(...xs)-pad, maxX=Math.max(...xs)+pad;
  const minY=Math.min(...ys)-pad, maxY=Math.max(...ys)+pad;
  root.setAttribute('viewBox',`${minX} ${minY} ${maxX-minX} ${maxY-minY}`);

  // soft depth shade reused by every tile
  const defs=svg('defs');
  const grad=svg('linearGradient',{id:'hexshade',x1:0,y1:0,x2:0,y2:1});
  grad.appendChild(svg('stop',{offset:'0%','stop-color':'#ffffff','stop-opacity':.10}));
  grad.appendChild(svg('stop',{offset:'55%','stop-color':'#ffffff','stop-opacity':0}));
  grad.appendChild(svg('stop',{offset:'100%','stop-color':'#000000','stop-opacity':.16}));
  defs.appendChild(grad);
  root.appendChild(defs);

  const gC=svg('g'),gH=svg('g'),gP=svg('g',{class:'port-g'}),gA=svg('g'),gR=svg('g'),gB=svg('g'),gT=svg('g'),gI=svg('g');
  root.append(gC,gP,gH,gA,gT,gR,gB,gI);

  // island coast rim — unifies the tiles into one landmass
  for(const h of b.hexes){
    const cs=hexCorners(h.x,h.y).map(([x,y])=>[h.x+(x-h.x)*1.09,h.y+(y-h.y)*1.09]);
    gC.appendChild(svg('polygon',{points:cs.map(c=>c.join(',')).join(' '),
      fill:'#8a7a58',stroke:'#8a7a58','stroke-width':7,'stroke-linejoin':'round'}));
  }

  const p=curP(S);
  const robberVictimMode = mode==='robber';

  // hexes
  for(const h of b.hexes){
    const cs=hexCorners(h.x,h.y);
    const poly=svg('polygon',{points:cs.map(c=>c.join(',')).join(' '),
      class:'hex'+(h.id===b.robber?' dim':''),
      fill:h.terrain==='desert'?DESERT_TILE:RES_META[h.terrain].tile});
    if(robberVictimMode&&h.id!==b.robber){
      poly.style.cursor='pointer';
      poly.addEventListener('click',()=>onHexTap(h.id));
      poly.style.filter='brightness(1.12)';
    }
    gH.appendChild(poly);
    const shade=svg('polygon',{points:cs.map(c=>c.join(',')).join(' '),fill:'url(#hexshade)','pointer-events':'none'});
    gH.appendChild(shade);
    const rim=cs.map(([x,y])=>[h.x+(x-h.x)*0.93,h.y+(y-h.y)*0.93]);
    gH.appendChild(svg('polygon',{points:rim.map(c=>c.join(',')).join(' '),fill:'none',
      stroke:'rgba(255,255,255,.13)','stroke-width':1.6,'pointer-events':'none',
      class:h.id===b.robber?'dim':''}));
    const artG=svg('g',{class:h.id===b.robber?'dim':'', 'pointer-events':'none'});
    addTerrainArt(artG,h);
    gA.appendChild(artG);
    if(h.num){
      const hot=h.num===6||h.num===8;
      const g=svg('g',{class:'token'+(hot?' hot':''),transform:`translate(${h.x},${h.y})`});
      g.appendChild(svg('circle',{r:17}));
      const t=svg('text',{y:5,class:'n','font-size':hot?17:15});
      t.textContent=h.num; g.appendChild(t);
      const pips=svg('text',{y:13,class:'pips','font-size':7});
      pips.textContent='•'.repeat(PIPS[h.num]); g.appendChild(pips);
      gT.appendChild(g);
    }
    if(h.id===b.robber){
      const ox=h.x+(h.num?19:0)-19, oy=h.y-(h.num?26:20);
      const g=svg('g',{class:'robber-piece',transform:`translate(${ox},${oy}) scale(0.075)`});
      for(const d of GI.robber) g.appendChild(svg('path',{d,fill:'#20242e',stroke:'#0a0f16','stroke-width':10}));
      gB.appendChild(g);
    }
  }

  // ports
  for(const port of b.ports){
    const e=b.E[port.edge];
    const va=b.V[e.a],vb=b.V[e.b];
    const mx=(va.x+vb.x)/2,my=(va.y+vb.y)/2;
    const d=Math.hypot(mx,my)||1;
    const ox=mx+mx/d*26, oy=my+my/d*26;
    const g=svg('g',{transform:`translate(${ox},${oy})`});
    for(const v of [va,vb])
      gP.appendChild(svg('line',{x1:ox,y1:oy,x2:v.x,y2:v.y,stroke:'rgba(234,228,211,.25)','stroke-width':2,'stroke-dasharray':'3 3'}));
    const col=port.type==='any'?'#5b7089':RES_META[port.type].col;
    g.appendChild(svg('circle',{r:13,fill:'#0d1b2a',stroke:col,'stroke-width':2.5,class:'pc'}));
    const t=svg('text',{y:4});
    t.style.fill=col;
    t.textContent=port.type==='any'?'3:1':'2:1';
    g.appendChild(t);
    gP.appendChild(g);
  }

  // roads
  for(const e of Object.values(b.E)){
    if(e.road===null) continue;
    const va=b.V[e.a],vb=b.V[e.b];
    const t=0.16;
    gR.appendChild(svg('line',{class:'road',
      x1:va.x+(vb.x-va.x)*t,y1:va.y+(vb.y-va.y)*t,
      x2:vb.x+(va.x-vb.x)*t,y2:vb.y+(va.y-vb.y)*t,
      stroke:S.players[e.road].color}));
  }
  // buildings
  for(const v of Object.values(b.V)){
    if(!v.bld) continue;
    const col=S.players[v.bld.p].color;
    const g=svg('g',{class:'piece',transform:`translate(${v.x},${v.y})`});
    if(v.bld.type==='sett'){
      g.appendChild(svg('path',{d:'M -8 8 L -8 -2 L 0 -10 L 8 -2 L 8 8 Z',fill:col,stroke:'#081019','stroke-width':1.6}));
    } else {
      g.appendChild(svg('path',{d:'M -11 9 L -11 -3 L -5 -9 L 1 -3 L 1 -1 L 11 -1 L 11 9 Z',fill:col,stroke:'#081019','stroke-width':1.6}));
      g.appendChild(svg('circle',{cx:6,cy:3,r:1.8,fill:'#081019',opacity:.55}));
    }
    gB.appendChild(g);
  }

  // interactive spots
  if(!p.bot){
    if(mode==='setup-sett'||mode==='sett'){
      for(const vk of settSpots(S,p,mode==='setup-sett')){
        const v=b.V[vk];
        const c=svg('circle',{cx:v.x,cy:v.y,r:11,class:'spot'});
        c.addEventListener('click',()=>onVertexTap(vk));
        gI.appendChild(c);
      }
    }
    if(mode==='city'){
      for(const vk of citySpots(S,p)){
        const v=b.V[vk];
        const c=svg('circle',{cx:v.x,cy:v.y,r:13,class:'spot'});
        c.addEventListener('click',()=>onVertexTap(vk));
        gI.appendChild(c);
      }
    }
    if(mode==='setup-road'||mode==='road'){
      const opts=mode==='setup-road'?roadSpots(S,p,S.lastSetupSett):roadSpots(S,p,null);
      for(const ek of opts){
        const e=b.E[ek];
        const va=b.V[e.a],vb=b.V[e.b];
        const t=0.22;
        const l=svg('line',{class:'edge-spot',
          x1:va.x+(vb.x-va.x)*t,y1:va.y+(vb.y-va.y)*t,
          x2:vb.x+(va.x-vb.x)*t,y2:vb.y+(va.y-vb.y)*t});
        l.addEventListener('click',()=>onEdgeTap(ek));
        gI.appendChild(l);
      }
    }
  }
}

/* ---------------- wire up ---------------- */
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
  boot();
});
