/* ================= HEXHAVEN ENGINE ================= */
'use strict';

const RES = ['wood','brick','sheep','wheat','ore'];
const RES_META = {
  wood:{label:'Lumber', ic:'🌲', col:'#3e7c4f', tile:'#2f6b45'},
  brick:{label:'Brick', ic:'🧱', col:'#c4633f', tile:'#a9553a'},
  sheep:{label:'Wool',  ic:'🐑', col:'#8fbf6a', tile:'#7fae53'},
  wheat:{label:'Grain', ic:'🌾', col:'#e2b84b', tile:'#d0a53a'},
  ore:{label:'Ore',   ic:'⛰️', col:'#7c8ca6', tile:'#6b7a94'},
};
const DESERT_TILE = '#c9b48a';
const COST = {
  road:{wood:1,brick:1},
  sett:{wood:1,brick:1,sheep:1,wheat:1},
  city:{wheat:2,ore:3},
  dev:{sheep:1,wheat:1,ore:1},
};
const DEV_META = {
  knight:{label:'Knight', ic:'⚔️', desc:'Move the robber and steal 1 card.'},
  vp:{label:'Victory Point', ic:'🏵️', desc:'Worth 1 VP, kept hidden.'},
  road:{label:'Road Building', ic:'🛤️', desc:'Build 2 roads for free.'},
  plenty:{label:'Year of Plenty', ic:'🎁', desc:'Take any 2 resources from the bank.'},
  mono:{label:'Monopoly', ic:'💰', desc:'All players give you every card of one resource.'},
};
const PLAYER_COLORS = [
  {id:'crimson', hex:'#e0555a'},
  {id:'azure',   hex:'#4c9ee3'},
  {id:'ivory',   hex:'#e8e4d8'},
  {id:'amber',   hex:'#e58f3c'},
];
const BOT_NAMES = ['Bruna','Otto','Sable','Wren','Idris','Marta'];
const PIPS = {2:1,3:2,4:3,5:4,6:5,8:5,9:4,10:3,11:2,12:1};

const shuffle = a => { a=a.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
const clone = o => JSON.parse(JSON.stringify(o));
const sum = o => Object.values(o).reduce((a,b)=>a+b,0);
const handSize = p => sum(p.res);

/* ---------------- board generation ---------------- */
const HEX_SIZE = 56;

function hexCorners(cx,cy){
  const pts=[];
  for(let i=0;i<6;i++){
    const ang=Math.PI/180*(60*i-30);
    pts.push([cx+HEX_SIZE*Math.cos(ang), cy+HEX_SIZE*Math.sin(ang)]);
  }
  return pts;
}
const vkey = (x,y)=>Math.round(x)+','+Math.round(y);
const ekey = (a,b)=> a<b ? a+'|'+b : b+'|'+a;

function buildBoard(layout, radius){
  radius = radius || 2;                        // 2=Standard(19) · 3=Large(37) · 4=Huge(61)
  const hexes=[];
  for(let q=-radius;q<=radius;q++) for(let r=-radius;r<=radius;r++){
    if(Math.abs(q+r)<=radius){
      const x=HEX_SIZE*Math.sqrt(3)*(q+r/2), y=HEX_SIZE*1.5*r;
      hexes.push({id:hexes.length,q,r,x,y,terrain:null,num:null});
    }
  }
  const N=hexes.length;
  // terrain pool — ~1 desert per 19 hexes, resources in the classic 4:4:4:3:3 ratio, scaled
  const deserts=Math.max(1,Math.round(N/19));
  const landN=N-deserts;
  const ratio={wood:4,sheep:4,wheat:4,brick:3,ore:3};
  const counts={}; let assigned=0;
  for(const k of RES){ counts[k]=Math.round(landN*ratio[k]/18); assigned+=counts[k]; }
  for(let i=0; assigned!==landN; i++){ const k=RES[i%RES.length], d=Math.sign(landN-assigned); if(counts[k]+d<0) continue; counts[k]+=d; assigned+=d; }
  const pool=[];
  for(const k of RES) for(let i=0;i<counts[k];i++) pool.push(k);
  for(let i=0;i<deserts;i++) pool.push('desert');
  const terr=shuffle(pool);
  hexes.forEach((h,i)=>h.terrain=terr[i]);

  // number placement
  const ring = h => (Math.abs(h.q)+Math.abs(h.r)+Math.abs(h.q+h.r))/2;
  const neighborsOf = h => hexes.filter(o=>o!==h && (Math.abs(o.q-h.q)+Math.abs(o.r-h.r)+Math.abs(o.q+o.r-h.q-h.r))/2===1);
  const landCount = hexes.filter(h=>h.terrain!=='desert').length;
  if(layout==='spiral' && radius===2){
    // classic variable setup: numbers laid in a spiral, guarantees no adjacent 6/8
    const seq=[5,2,6,3,8,10,9,12,11,4,8,10,9,4,5,6,3,11];
    const byRing=[2,1,0].map(rr=>hexes.filter(h=>ring(h)===rr)
      .sort((a,b)=>Math.atan2(a.y,a.x)-Math.atan2(b.y,b.x)));
    const order=[...byRing[0],...byRing[1],...byRing[2]];
    let k=0;
    for(const h of order){ if(h.terrain==='desert') continue; h.num=seq[k++]; }
  } else {
    // weighted number bag (Catan frequencies), scaled to the land-hex count
    const W=[[2,1],[3,2],[4,2],[5,2],[6,2],[8,2],[9,2],[10,2],[11,2],[12,1]];
    const base=[]; for(const [n,w] of W) for(let i=0;i<w;i++) base.push(n);
    const makeBag=()=>{ const bag=[]; while(bag.length<landCount) bag.push(...shuffle(base)); return shuffle(bag).slice(0,landCount); };
    for(let attempt=0;attempt<400;attempt++){
      const bag=makeBag(); let k=0;
      hexes.forEach(h=>{ h.num = h.terrain==='desert'?null:bag[k++]; });
      if(layout!=='balanced') break;
      const bad = hexes.some(h=>(h.num===6||h.num===8) && neighborsOf(h).some(n=>n.num===6||n.num===8));
      if(!bad) break;
    }
  }

  // vertices & edges
  const V={}, E={};
  for(const h of hexes){
    const cs=hexCorners(h.x,h.y);
    const keys=cs.map(([x,y])=>vkey(x,y));
    cs.forEach(([x,y],i)=>{
      const k=keys[i];
      if(!V[k]) V[k]={k,x,y,hexes:[],adj:[],edges:[],bld:null,port:null};
      V[k].hexes.push(h.id);
    });
    for(let i=0;i<6;i++){
      const a=keys[i], b=keys[(i+1)%6], ek=ekey(a,b);
      if(!E[ek]) E[ek]={k:ek,a,b,hexes:[],road:null};
      E[ek].hexes.push(h.id);
    }
  }
  for(const e of Object.values(E)){
    if(!V[e.a].adj.includes(e.b)) V[e.a].adj.push(e.b);
    if(!V[e.b].adj.includes(e.a)) V[e.b].adj.push(e.a);
    V[e.a].edges.push(e.k); V[e.b].edges.push(e.k);
  }

  // ports: walk the coastal edge cycle, drop 9 harbors around it
  const coast = Object.values(E).filter(e=>e.hexes.length===1);
  const chain=[coast[0]]; const used=new Set([coast[0].k]);
  while(chain.length<coast.length){
    const last=chain[chain.length-1];
    const nxt=coast.find(e=>!used.has(e.k)&&(e.a===last.a||e.a===last.b||e.b===last.a||e.b===last.b));
    if(!nxt) break;
    chain.push(nxt); used.add(nxt.k);
  }
  // ~1 harbour per 3.3 coastal edges, evenly spaced; one of each resource then 'any'
  const nPorts=Math.max(4, Math.round(chain.length/3.3));
  const specifics=shuffle(['wood','brick','sheep','wheat','ore']);
  const portTypes=shuffle(Array.from({length:nPorts},(_,i)=> i<specifics.length?specifics[i]:'any'));
  const ports=[];
  for(let i=0;i<nPorts;i++){
    const e=chain[Math.round(i*chain.length/nPorts)];
    if(!e) continue;
    const t=portTypes[i];
    V[e.a].port=t; V[e.b].port=t;
    ports.push({edge:e.k,type:t});
  }

  const desert=hexes.find(h=>h.terrain==='desert');
  return {hexes,V,E,ports,robber:desert.id};
}

/* ---------------- game state ---------------- */
function newGame(settings){
  const n=settings.bots+1;
  // scale the bank and dev deck to the board so bigger maps don't run dry
  const _rad=settings.mapSize||2, _N=1+3*_rad*(_rad+1), _land=_N-Math.max(1,Math.round(_N/19));
  const bankN=Math.max(19,Math.round(19*_land/18));
  const devMul=Math.max(1,Math.round(_land/18));
  const colors=PLAYER_COLORS.slice();
  const me=colors.splice(settings.colorIdx,1)[0];
  const botCols=shuffle(colors).slice(0,settings.bots);
  const botNames=shuffle(BOT_NAMES).slice(0,settings.bots);
  const players=[{i:0,name:settings.name||'You',color:me.hex,bot:false}];
  for(let b=0;b<settings.bots;b++)
    players.push({i:b+1,name:botNames[b],color:botCols[b].hex,bot:true});
  for(const p of players){
    p.res={wood:0,brick:0,sheep:0,wheat:0,ore:0};
    p.dev=[]; p.newdev=[]; p.knights=0; p.devVp=0;
    p.stock={road:15,sett:5,city:4};
    p.playedDevThisTurn=false;
  }
  const devDeck=shuffle([
    ...Array(14*devMul).fill('knight'), ...Array(5*devMul).fill('vp'),
    ...Array(2*devMul).fill('road'), ...Array(2*devMul).fill('plenty'), ...Array(2*devMul).fill('mono'),
  ]);
  const order = shuffle(players.map(p=>p.i));
  const S={
    settings, players, board:buildBoard(settings.layout, settings.mapSize),
    bank:{wood:bankN,brick:bankN,sheep:bankN,wheat:bankN,ore:bankN}, devDeck,
    order, turnPtr:0,
    phase:'setup',
    setupQueue:[...order, ...order.slice().reverse()],
    setupStep:'sett', lastSetupSett:null,
    dice:null, rolled:false,
    longestRoad:{owner:null,len:0}, largestArmy:{owner:null,size:0},
    discardQueue:[], pendingSteal:null, freeRoads:0,
    winner:null, log:[],
  };
  if(settings.expWild) applyWildExpansion(S);
  return S;
}

/* ---------- expansion: wild terrains (guarded by settings.expWild) ---------- */
// A hex names its 3D model via h.art while the engine keeps paying out on h.terrain.
// 'gold' is a real new terrain (pays a wild); 'jungle' is art-only over wood (pays lumber).
function applyWildExpansion(S){
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const goldCands=S.board.hexes.filter(h=>h.num&&h.terrain!=='desert'&&h.num!==6&&h.num!==8);
  if(goldCands.length){ const g=pick(goldCands); g.terrain='gold'; g.art='gold'; }
  const forests=S.board.hexes.filter(h=>h.terrain==='wood'&&!h.art);
  if(forests.length){ pick(forests).art='jungle'; }
}
// least-held resource the bank can still pay (used for Gold Field's wild payout)
function neediestResource(S,pl){
  let best=null,bv=Infinity;
  for(const r of RES){ if(S.bank[r]<=0) continue; if(pl.res[r]<bv){ bv=pl.res[r]; best=r; } }
  return best;
}
const curP = S => S.phase==='setup' ? S.players[S.setupQueue[0]] : S.players[S.order[S.turnPtr]];

function vp(S,p,includeHidden){
  let v=0;
  for(const vx of Object.values(S.board.V))
    if(vx.bld&&vx.bld.p===p.i) v += vx.bld.type==='city'?2:1;
  if(S.longestRoad.owner===p.i) v+=2;
  if(S.largestArmy.owner===p.i) v+=2;
  if(includeHidden) v+=p.devVp;
  return v;
}
function checkWin(S){
  const p=curP(S);
  if(vp(S,p,true)>=S.settings.target){ S.phase='over'; S.winner=p.i; return true; }
  return false;
}
function log(S,msg,sys){ S.log.push({msg,sys:!!sys}); if(S.log.length>120) S.log.shift(); }

/* ---------------- legality ---------------- */
function canAfford(p,cost){ return Object.entries(cost).every(([r,n])=>p.res[r]>=n); }
function pay(S,p,cost){ for(const [r,n] of Object.entries(cost)){ p.res[r]-=n; S.bank[r]+=n; } }

function settSpots(S,p,setup){
  const out=[];
  for(const v of Object.values(S.board.V)){
    if(v.bld) continue;
    if(v.adj.some(k=>S.board.V[k].bld)) continue; // distance rule
    if(!setup){
      const ownRoad=v.edges.some(ek=>S.board.E[ek].road===p.i);
      if(!ownRoad) continue;
    }
    out.push(v.k);
  }
  return out;
}
function roadSpots(S,p,fromVertex){
  const out=[];
  for(const e of Object.values(S.board.E)){
    if(e.road!==null) continue;
    if(fromVertex){ if(e.a===fromVertex||e.b===fromVertex) out.push(e.k); continue; }
    for(const end of [e.a,e.b]){
      const v=S.board.V[end];
      if(v.bld && v.bld.p===p.i){ out.push(e.k); break; }
      if(v.bld && v.bld.p!==p.i) continue; // cannot build through opponent building
      if(v.edges.some(k=>S.board.E[k].road===p.i)){ out.push(e.k); break; }
    }
  }
  return [...new Set(out)];
}
function citySpots(S,p){
  return Object.values(S.board.V).filter(v=>v.bld&&v.bld.p===p.i&&v.bld.type==='sett').map(v=>v.k);
}
function portsOf(S,p){
  const set=new Set();
  for(const v of Object.values(S.board.V))
    if(v.bld&&v.bld.p===p.i&&v.port) set.add(v.port);
  return set;
}
function rateFor(S,p,res){
  const ports=portsOf(S,p);
  if(ports.has(res)) return 2;
  if(ports.has('any')) return 3;
  return 4;
}

/* ---------------- mutations ---------------- */
function placeSett(S,p,vk,setup){
  const v=S.board.V[vk];
  v.bld={p:p.i,type:'sett'};
  p.stock.sett--;
  if(!setup){ pay(S,p,COST.sett); recomputeLongestRoad(S); }
  log(S,`<b>${p.name}</b> built a settlement`);
}
function placeCity(S,p,vk){
  S.board.V[vk].bld={p:p.i,type:'city'};
  p.stock.city--; p.stock.sett++;
  pay(S,p,COST.city);
  log(S,`<b>${p.name}</b> upgraded to a city`);
}
function placeRoad(S,p,ek,free){
  S.board.E[ek].road=p.i;
  p.stock.road--;
  if(!free) pay(S,p,COST.road);
  recomputeLongestRoad(S);
  log(S,`<b>${p.name}</b> built a road`);
}
function grantSetupResources(S,p,vk){
  for(const hid of S.board.V[vk].hexes){
    const h=S.board.hexes[hid];
    if(h.terrain!=='desert'&&h.terrain){ const r=h.terrain; if(S.bank[r]>0){ S.bank[r]--; p.res[r]++; } }
  }
}

function rollDice(S){
  const d1=1+Math.floor(Math.random()*6), d2=1+Math.floor(Math.random()*6);
  S.dice=[d1,d2]; S.rolled=true;
  const total=d1+d2;
  log(S,`<b>${curP(S).name}</b> rolled <b>${total}</b>`,true);
  if(total===7){
    S.discardQueue=S.players.filter(p=>handSize(p)>7).map(p=>p.i);
    return {seven:true};
  }
  distribute(S,total);
  return {seven:false};
}
function distribute(S,total){
  const gains=S.players.map(()=>({wood:0,brick:0,sheep:0,wheat:0,ore:0}));
  const gold={};
  for(const h of S.board.hexes){
    if(h.num!==total || h.id===S.board.robber) continue;
    const cs=hexCorners(h.x,h.y);
    if(h.terrain==='gold'){
      for(const [x,y] of cs){ const v=S.board.V[vkey(x,y)]; if(v&&v.bld) gold[v.bld.p]=(gold[v.bld.p]||0)+(v.bld.type==='city'?2:1); }
      continue;
    }
    const res=h.terrain;
    for(const [x,y] of cs){
      const v=S.board.V[vkey(x,y)];
      if(v&&v.bld) gains[v.bld.p][res]+= v.bld.type==='city'?2:1;
    }
  }
  // bank shortage rule: if bank can't cover everyone for a resource, only a single claimant gets the remainder
  for(const r of RES){
    const want=gains.reduce((a,g)=>a+g[r],0);
    if(want===0) continue;
    const claimants=gains.filter(g=>g[r]>0).length;
    if(want>S.bank[r]&&claimants>1){ gains.forEach(g=>g[r]=0); log(S,`Bank is out of ${RES_META[r].label} — no one collects it`,true); continue; }
    for(const [pi,g] of gains.entries()){
      const give=Math.min(g[r],S.bank[r]);
      if(give>0){ S.bank[r]-=give; S.players[pi].res[r]+=give; g[r]=give; }
      else g[r]=0;
    }
  }
  S.lastGains=gains;
  for(const [pi,g] of gains.entries()){
    const parts=RES.filter(r=>g[r]>0).map(r=>`+${g[r]} ${RES_META[r].label}`);
    if(parts.length) log(S,`<b>${S.players[pi].name}</b> ${parts.join(', ')}`);
  }
  // Gold Field pays a wild — each affected player auto-takes their neediest from the bank
  for(const pi of Object.keys(gold)){
    const pl=S.players[pi]; let got=0;
    for(let k=0;k<gold[pi];k++){ const r=neediestResource(S,pl); if(r){ S.bank[r]--; pl.res[r]++; gains[pi][r]++; got++; } }
    if(got) log(S,`<b>${pl.name}</b> struck gold (+${got})`);
  }
}

function moveRobber(S,hexId){
  S.board.robber=hexId;
  const h=S.board.hexes[hexId];
  log(S,`<b>${curP(S).name}</b> moved the robber`,true);
  // victims: players with buildings on this hex (excluding mover), with cards
  const cs=hexCorners(h.x,h.y);
  const victims=new Set();
  for(const [x,y] of cs){
    const v=S.board.V[vkey(x,y)];
    if(v&&v.bld&&v.bld.p!==curP(S).i){
      const t=S.players[v.bld.p];
      if(handSize(t)>0){
        if(S.settings.friendlyRobber && vp(S,t,false)<3) continue;
        victims.add(t.i);
      }
    }
  }
  return [...victims];
}
function steal(S,fromI){
  const thief=curP(S), victim=S.players[fromI];
  const pool=[];
  for(const r of RES) for(let i=0;i<victim.res[r];i++) pool.push(r);
  if(!pool.length) return null;
  const r=pool[Math.floor(Math.random()*pool.length)];
  victim.res[r]--; thief.res[r]++;
  log(S,`<b>${thief.name}</b> stole a card from <b>${victim.name}</b>`);
  return r;
}
function discard(S,p,sel){
  for(const [r,n] of Object.entries(sel)){ p.res[r]-=n; S.bank[r]+=n; }
  log(S,`<b>${p.name}</b> discarded ${sum(sel)} cards`);
  S.discardQueue=S.discardQueue.filter(i=>i!==p.i);
}

function buyDev(S,p){
  if(!S.devDeck.length) return null;
  pay(S,p,COST.dev);
  const c=S.devDeck.pop();
  if(c==='vp'){ p.devVp++; p.dev.push(c); }
  else p.newdev.push(c);
  log(S,`<b>${p.name}</b> bought a development card`);
  return c;
}
function playDev(S,p,card){
  p.dev.splice(p.dev.indexOf(card),1);
  p.playedDevThisTurn=true;
  log(S,`<b>${p.name}</b> played <b>${DEV_META[card].label}</b>`,true);
  if(card==='knight'){
    p.knights++;
    if(p.knights>=3&&p.knights>S.largestArmy.size){
      if(S.largestArmy.owner!==p.i){ S.largestArmy={owner:p.i,size:p.knights}; log(S,`<b>Largest Army</b> → <b>${p.name}</b> (${p.knights} knights)`,true); }
      else S.largestArmy.size=p.knights;
    }
  }
}
function monopoly(S,p,res){
  let got=0;
  for(const o of S.players){ if(o.i===p.i) continue; got+=o.res[res]; o.res[res]=0; }
  p.res[res]+=got;
  log(S,`<b>${p.name}</b> monopolized ${RES_META[res].label} (+${got})`);
}
function yearOfPlenty(S,p,r1,r2){
  for(const r of [r1,r2]) if(S.bank[r]>0){ S.bank[r]--; p.res[r]++; }
  log(S,`<b>${p.name}</b> took ${RES_META[r1].label} + ${RES_META[r2].label} from the bank`);
}
function bankTrade(S,p,give,get){
  const rate=rateFor(S,p,give);
  if(p.res[give]<rate||S.bank[get]<1) return false;
  p.res[give]-=rate; S.bank[give]+=rate;
  S.bank[get]--; p.res[get]++;
  log(S,`<b>${p.name}</b> traded ${rate} ${RES_META[give].label} → 1 ${RES_META[get].label}`);
  return true;
}
function playerTrade(S,a,b,give,get){
  for(const [r,n] of Object.entries(give)){ a.res[r]-=n; b.res[r]+=n; }
  for(const [r,n] of Object.entries(get)){ b.res[r]-=n; a.res[r]+=n; }
  log(S,`<b>${a.name}</b> traded with <b>${b.name}</b>`,true);
}

function endTurn(S){
  const p=curP(S);
  p.dev.push(...p.newdev); p.newdev=[];
  p.playedDevThisTurn=false;
  S.rolled=false; S.dice=null;
  S.turnPtr=(S.turnPtr+1)%S.players.length;
}

/* ---------------- longest road ---------------- */
function recomputeLongestRoad(S){
  const lens=S.players.map(p=>{ const l=longestRoadOf(S,p.i); p.roadLen=l; return l; });
  const cur=S.longestRoad.owner;
  if(cur!==null&&lens[cur]>=5){
    // holder keeps the card unless someone strictly exceeds them
    let owner=cur,len=lens[cur];
    for(const p of S.players) if(lens[p.i]>len){ owner=p.i; len=lens[p.i]; }
    if(owner!==cur) log(S,`<b>Longest Road</b> → <b>${S.players[owner].name}</b> (${len})`,true);
    S.longestRoad={owner,len};
  } else {
    // holder was cut below 5 (or no holder): award to unique max ≥5, else nobody
    const max=Math.max(...lens);
    const holders=S.players.filter(p=>lens[p.i]===max&&max>=5);
    if(holders.length===1){
      S.longestRoad={owner:holders[0].i,len:max};
      if(holders[0].i!==cur) log(S,`<b>Longest Road</b> → <b>${holders[0].name}</b> (${max})`,true);
    } else {
      if(cur!==null) log(S,`The <b>Longest Road</b> card is set aside`,true);
      S.longestRoad={owner:null,len:0};
    }
  }
}
function longestRoadOf(S,pi){
  const E=S.board.E,V=S.board.V;
  const mine=Object.values(E).filter(e=>e.road===pi);
  let best=0;
  const walk=(vk,used,len)=>{
    best=Math.max(best,len);
    const v=V[vk];
    if(v.bld&&v.bld.p!==pi) return; // opponent building breaks the road
    for(const ek2 of v.edges){
      const e2=E[ek2];
      if(e2.road!==pi||used.has(ek2)) continue;
      used.add(ek2);
      walk(e2.a===vk?e2.b:e2.a,used,len+1);
      used.delete(ek2);
    }
  };
  for(const e of mine){
    for(const start of [e.a,e.b]){
      const used=new Set([e.k]);
      walk(e.a===start?e.b:e.a,used,1);
    }
  }
  return best;
}

/* ================= BOT AI ================= */
function noise(S){ return S.settings.difficulty==='casual'?2.2:S.settings.difficulty==='standard'?0.9:0.15; }

function vertexScore(S,vk,p){
  const v=S.board.V[vk];
  let pips=0; const kinds=new Set();
  for(const hid of v.hexes){
    const h=S.board.hexes[hid];
    if(h.num){ pips+=PIPS[h.num]; kinds.add(h.terrain); }
  }
  let s=pips + kinds.size*0.8;
  if(v.hexes.some(hid=>S.board.hexes[hid].terrain==='gold')) s+=1.6;   // Gold Fields are prime
  if(v.port==='any') s+=0.7; else if(v.port) s+=1.0;
  // diversity vs what the bot already produces
  if(p){
    const have=new Set();
    for(const vx of Object.values(S.board.V))
      if(vx.bld&&vx.bld.p===p.i) vx.hexes.forEach(h=>{const hx=S.board.hexes[h]; if(hx.num) have.add(hx.terrain);});
    for(const k of kinds) if(!have.has(k)) s+=0.9;
  }
  return s + (Math.random()-0.5)*noise(S);
}

function botSetupSett(S,p){
  const spots=settSpots(S,p,true);
  return spots.reduce((a,b)=>vertexScore(S,a,p)>=vertexScore(S,b,p)?a:b);
}
function botSetupRoad(S,p,vk){
  const opts=roadSpots(S,p,vk);
  // point road toward the best open nearby vertex
  let best=opts[0],bs=-1;
  for(const ek of opts){
    const e=S.board.E[ek];
    const far=e.a===vk?e.b:e.a;
    const s=Math.max(0,...S.board.V[far].adj.filter(k=>!S.board.V[k].bld).map(k=>vertexScore(S,k,p)));
    if(s>bs){bs=s;best=ek;}
  }
  return best;
}

function botDiscard(S,p){
  const n=Math.floor(handSize(p)/2);
  const sel={wood:0,brick:0,sheep:0,wheat:0,ore:0};
  const priority=r=>{ // keep what feeds the next build
    const want=canAfford(p,COST.city)||citySpots(S,p).length? {wheat:2,ore:3} : {wood:1,brick:1,sheep:1,wheat:1};
    return (want[r]||0);
  };
  for(let i=0;i<n;i++){
    let pick=null,bv=1e9;
    for(const r of RES){
      const left=p.res[r]-sel[r];
      if(left<=0) continue;
      const v=priority(r)*2 + (left<=1?1:0) + Math.random()*.3;
      if(v<bv){bv=v;pick=r;}
    }
    if(pick) sel[pick]++;
  }
  return sel;
}

function botRobberHex(S,p){
  const leader=S.players.filter(o=>o.i!==p.i).sort((a,b)=>vp(S,b,false)-vp(S,a,false))[0];
  let best=null,bs=-1;
  for(const h of S.board.hexes){
    if(h.id===S.board.robber||!h.num) continue;
    const cs=hexCorners(h.x,h.y);
    let score=0, mine=false, victims=false;
    for(const [x,y] of cs){
      const v=S.board.V[vkey(x,y)];
      if(v&&v.bld){
        const w=(v.bld.type==='city'?2:1)*PIPS[h.num];
        if(v.bld.p===p.i){ mine=true; }
        else{
          score+=w*(v.bld.p===leader.i?1.6:1);
          const t=S.players[v.bld.p];
          if(handSize(t)>0&&(!S.settings.friendlyRobber||vp(S,t,false)>=3)) victims=true;
        }
      }
    }
    if(mine) score-=6;
    if(victims) score+=1.5;
    score+=(Math.random()-.5)*noise(S);
    if(score>bs){bs=score;best=h.id;}
  }
  return best ?? S.board.hexes.find(h=>h.id!==S.board.robber).id;
}
function botStealTarget(S,victims){
  return victims.slice().sort((a,b)=>handSize(S.players[b])-handSize(S.players[a]))[0];
}

// what the bot still needs for its preferred build
function botNeeds(S,p){
  if(citySpots(S,p).length&&p.stock.city>0) return COST.city;
  if(settSpots(S,p,false).length&&p.stock.sett>0) return COST.sett;
  if(p.stock.sett>0&&p.stock.road>0) return {wood:1,brick:1};
  return COST.dev;
}

function botEvaluateOffer(S,p,give,get){
  // give/get from the *offerer's* perspective: bot receives `give`, pays `get`
  if(!Object.entries(get).every(([r,n])=>p.res[r]>=n)) return false;
  const needs=botNeeds(S,p);
  const val=r=>{
    const short=Math.max(0,(needs[r]||0)-p.res[r]);
    return 1+short*1.2+(p.res[r]===0?0.4:0)-(p.res[r]>=4?0.4:0);
  };
  let inV=0,outV=0;
  for(const [r,n] of Object.entries(give)) inV+=val(r)*n;
  for(const [r,n] of Object.entries(get)) outV+=val(r)*n;
  const bar=S.settings.difficulty==='casual'?-0.3:S.settings.difficulty==='standard'?0.15:0.5;
  // never help a player about to win
  const offerer=curP(S);
  if(vp(S,offerer,false)>=S.settings.target-2&&S.settings.difficulty!=='casual') return false;
  return inV-outV>bar;
}

// one bot "step": returns an action descriptor (for UI pacing) or null when done
function botStep(S,p){
  // 1) city
  if(canAfford(p,COST.city)&&p.stock.city>0){
    const spots=citySpots(S,p);
    if(spots.length){
      const vk=spots.reduce((a,b)=>vertexScore(S,a)>=vertexScore(S,b)?a:b);
      placeCity(S,p,vk); return {type:'city',vk};
    }
  }
  // 2) settlement
  if(canAfford(p,COST.sett)&&p.stock.sett>0){
    const spots=settSpots(S,p,false);
    if(spots.length){
      const vk=spots.reduce((a,b)=>vertexScore(S,a,p)>=vertexScore(S,b,p)?a:b);
      placeSett(S,p,vk,false); return {type:'sett',vk};
    }
  }
  // 3) road toward a good expansion (only if a sett is still worth chasing)
  if(canAfford(p,COST.road)&&p.stock.road>0&&p.stock.sett>0){
    const opts=roadSpots(S,p,null);
    if(opts.length){
      let best=null,bs=1.2; // must beat a threshold so bots don't spam roads
      for(const ek of opts){
        const e=S.board.E[ek];
        for(const end of [e.a,e.b]){
          const v=S.board.V[end];
          if(!v.bld&&!v.adj.some(k=>S.board.V[k].bld)){
            const s=vertexScore(S,end,p);
            if(s>bs){bs=s;best=ek;}
          }
        }
        // also extend toward open vertices two steps out
        if(!best&&Math.random()<0.2) best=ek;
      }
      const raceRoad = S.longestRoad.owner!==p.i && (p.roadLen||0)>=3 && Math.random()<0.5;
      if(best||raceRoad){
        placeRoad(S,p,best||opts[Math.floor(Math.random()*opts.length)],false);
        return {type:'road'};
      }
    }
  }
  // 4) buy dev
  if(canAfford(p,COST.dev)&&S.devDeck.length&&(S.settings.difficulty!=='casual'||Math.random()<.6)){
    buyDev(S,p); return {type:'dev'};
  }
  // 5) bank/port trade toward needs
  const needs=botNeeds(S,p);
  for(const want of RES){
    const short=(needs[want]||0)-p.res[want];
    if(short<=0) continue;
    for(const give of RES){
      if(needs[give]) continue;
      const rate=rateFor(S,p,give);
      if(p.res[give]>=rate+((needs[give]||0))){
        if(bankTrade(S,p,give,want)) return {type:'trade'};
      }
    }
  }
  return null;
}

function botMaybePlayDev(S,p){
  const playable=p.dev.filter(c=>c!=='vp');
  if(!playable.length||p.playedDevThisTurn) return null;
  // knight: play if robber is on us, or to push for largest army
  if(playable.includes('knight')){
    const onUs=(()=>{const h=S.board.hexes[S.board.robber];return hexCorners(h.x,h.y).some(([x,y])=>{const v=S.board.V[vkey(x,y)];return v&&v.bld&&v.bld.p===p.i;});})();
    if(onUs||p.knights+1>=Math.max(3,S.largestArmy.size+1)&&S.largestArmy.owner!==p.i&&Math.random()<.7){
      return 'knight';
    }
  }
  if(playable.includes('road')&&p.stock.road>=2) return 'road';
  if(playable.includes('plenty')) return 'plenty';
  if(playable.includes('mono')){
    // only if a resource we need is plentiful among others
    const needs=botNeeds(S,p);
    for(const r of RES){
      const around=S.players.filter(o=>o.i!==p.i).reduce((a,o)=>a+o.res[r],0);
      if((needs[r]||0)>0&&around>=3) return 'mono';
    }
  }
  return null;
}
function botMonopolyPick(S,p){
  let best='wheat',bv=-1;
  for(const r of RES){
    const around=S.players.filter(o=>o.i!==p.i).reduce((a,o)=>a+o.res[r],0);
    const v=around+((botNeeds(S,p)[r]||0)*1.5);
    if(v>bv){bv=v;best=r;}
  }
  return best;
}
function botPlentyPick(S,p){
  const needs=botNeeds(S,p);
  const picks=[];
  for(const r of RES){
    let short=Math.max(0,(needs[r]||0)-p.res[r]);
    while(short-->0&&picks.length<2) picks.push(r);
  }
  while(picks.length<2) picks.push(RES[Math.floor(Math.random()*5)]);
  return picks.slice(0,2);
}
