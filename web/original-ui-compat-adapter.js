(function(){
  'use strict';
  const ROOT = window;
  const EL = { '火':'fire', '水':'water', '风':'wind', '土':'earth', fire:'fire', water:'water', wind:'wind', earth:'earth' };
  const EL_ICON = { '火':'🔥', '水':'💧', '风':'🌬', '土':'🪨', fire:'🔥', water:'💧', wind:'🌬', earth:'🪨' };
  const LEGACY_EL = { '火':'fire', '水':'water', '风':'wind', '土':'earth' };
  const state = { vm:null, snapshot:null, report:'', shopReport:'', selectedHero:null, selectedSlot:null, selectedCell:null, lastMode:'player', ready:false };

  function $(id){ return document.getElementById(id); }
  function esc(v){ return String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
  function pct(v,max){ return max ? Math.max(0, Math.min(100, Math.round((Number(v)||0) / (Number(max)||1) * 100))) : 0; }
  function logLine(text){ const log=$('log'); if(!log)return; const d=document.createElement('div'); d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; while(log.children.length>80)log.removeChild(log.firstChild); }
  async function api(path, opts){
    const res = await fetch(path, Object.assign({ cache:'no-store' }, opts || {}));
    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch(e){ throw new Error('API JSON解析失败: '+path+' '+text.slice(0,120)); }
    if(!res.ok || data.ok === false) throw new Error(data.error || ('HTTP '+res.status));
    return data;
  }
  async function post(path, body){
    return api(path, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body || {}) });
  }
  async function refreshFromView(){ const data = await api('/api/view'); state.vm = data.viewModel; syncLegacyState(); return state.vm; }
  async function refreshSnapshot(){ const data = await api('/api/state/snapshot'); state.snapshot = data.snapshot; return state.snapshot; }
  async function refreshReport(mode){ const data = await api('/api/report?mode=' + encodeURIComponent(mode || 'player')); if((mode||'player')==='shop') state.shopReport=data.report; else state.report=data.report; return data.report; }
  async function runCommand(type, payload){
    const data = await post('/api/action', Object.assign({ type }, payload || {}));
    state.vm = data.viewModel || state.vm;
    syncLegacyState();
    await refreshReport(state.lastMode || 'player').catch(()=>null);
    if(state.vm && state.vm.phase === 'shop') await refreshReport('shop').catch(()=>null);
    renderAll();
    return data;
  }
  async function newGame(opts){
    const data = await post('/api/action', Object.assign({ type:'NEW_GAME' }, opts || {}));
    state.vm = data.viewModel || data.view || data;
    state.report=''; state.shopReport=''; state.selectedHero=null; state.selectedSlot=null; state.selectedCell=null;
    syncLegacyState();
    renderAll();
    return data;
  }

  function toLegacyUnitDef(unit){
    const petId = unit.petId || unit.id;
    const tier = unit.poolTier || unit.tier || 1;
    const hp = unit.maxHp || unit.hp || 1;
    const element = LEGACY_EL[unit.element] || unit.element || 'fire';
    const slotEls = unit.shape && unit.shape.slotElements ? unit.shape.slotElements : [unit.element || '火', unit.element || '火', unit.element || '火'];
    return {
      id: petId,
      name: unit.name || petId,
      element,
      tier,
      role: unit.role || '单位',
      levels: {
        1: { hp, slots: slotEls.slice(0,3).map((el, i) => ({ el: LEGACY_EL[el] || element, sn: legacyShapeNumber(unit.shape), tier: 1, dir: 'right', layers: 1 })) },
        2: { hp: Math.ceil(hp*1.35), slots: slotEls.slice(0,3).map(el => ({ el: LEGACY_EL[el] || element, sn: legacyShapeNumber(unit.shape), tier: 2, dir: 'right', layers: 2 })) },
        3: { hp: Math.ceil(hp*1.7), slots: slotEls.slice(0,3).map(el => ({ el: LEGACY_EL[el] || element, sn: legacyShapeNumber(unit.shape), tier: 3, dir: 'right', layers: 3 })) },
        4: { hp: Math.ceil(hp*2.1), slots: slotEls.slice(0,3).map(el => ({ el: LEGACY_EL[el] || element, sn: legacyShapeNumber(unit.shape), tier: 4, dir: 'right', layers: 4 })) }
      }
    };
  }
  function legacyShapeNumber(shape){
    if(!shape) return 1;
    if(/横|扫/.test(shape.shapeName||shape.shapeClass||'')) return 2;
    if(/十字/.test(shape.shapeName||shape.shapeClass||'')) return 3;
    if(/列|竖/.test(shape.shapeName||shape.shapeClass||'')) return 4;
    return 1;
  }
  function ensureLegacyTables(vm){
    ROOT.UNIT_DEFS = ROOT.UNIT_DEFS || {};
    ROOT.UNIT_TIER_POOL = ROOT.UNIT_TIER_POOL || {1:[],2:[],3:[],4:[]};
    const all = [].concat(vm.heroes || [], vm.enemies || [], (vm.shop?.offers || []).map(o => ({ id:o.petId, petId:o.petId, name:o.name, element:o.element, role:o.role, hp:1, maxHp:1, shape:null, poolTier:o.poolTier })));
    for(const u of all){
      if(!u.petId && !u.id) continue;
      const def = toLegacyUnitDef(u);
      ROOT.UNIT_DEFS[def.id] = Object.assign(ROOT.UNIT_DEFS[def.id] || {}, def);
      const pool = ROOT.UNIT_TIER_POOL[def.tier] || (ROOT.UNIT_TIER_POOL[def.tier] = []);
      if(!pool.includes(def.id)) pool.push(def.id);
    }
  }
  function mapLegacyG(vm){
    const legacy = (typeof G !== 'undefined' && G) ? G : (ROOT.G || {});
    legacy.__fromAdapter = true;
    legacy.phase = vm.phase === 'shop' ? 'SHOP' : (vm.phase === 'day_end' || vm.result ? 'OVER' : 'PLAYER');
    legacy.day = vm.day || 1;
    legacy.dayHalf = vm.period === '下午' ? 2 : (vm.phase === 'shop' ? 1 : 0);
    legacy.wave = vm.round || 1;
    legacy.round = Math.max(1, vm.round || 1);
    legacy.maxRound = vm.maxRounds || 10;
    legacy.gold = vm.gold || 0;
    legacy.hitCount = 0;
    legacy.board = (typeof mkBoard === 'function') ? mkBoard() : Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>({r,c,el:null,stk:0})));
    legacy.elementCells = {};
    legacy.heroes = {};
    legacy.monsters = [];
    legacy.slots = [];
    legacy.ownedUnits = [];
    legacy.shopItems = legacy.shopItems || { units:[], consumables:[] };
    legacy.shopFrozen = legacy.shopFrozen || { units:new Set(), consumables:new Set() };
    const playerLeader = vm.leaders?.player || { hp: Math.max(1, (vm.castleLine || 10) * 8), maxHp: 80, position:{r:7,c:0} };
    const enemyLeader = vm.leaders?.enemy || { hp: 0, maxHp: 80, position:{r:0,c:7} };
    legacy.playerCastle = { hp: playerLeader.hp, maxHp: playerLeader.maxHp, pos:normalizePos(playerLeader.position, {r:7,c:0}), leaderId:playerLeader.id };
    legacy.enemyCastle = { hp: enemyLeader.hp, maxHp:enemyLeader.maxHp, pos:normalizePos(enemyLeader.position, {r:0,c:7}), leaderId:enemyLeader.id };
    legacy.summons = [];
    legacy.selHero = state.selectedHero;
    legacy.selSlot = state.selectedSlot;
    legacy.selectedCell = state.selectedCell;
    legacy.prevCells = [];
    legacy.explPos = null;
    legacy.previewEvents = [];
    legacy.coreSnapshot = { fromAdapter:true, viewModel: vm, _cellBriefs:{} };
    legacy.actionLog = (vm.events || []).map(e => ({ type:e.type, desc:e.text || e.type }));
    legacy.engineStats = { summonCount:0, healCount:0, chainCount:0, perfectCount:0 };
    legacy.growth = { summonTier:0, healTier:0, chainTier:0 };
    (vm.heroes || []).forEach((h, i) => {
      const hid = i === 0 ? 'ha' : i === 1 ? 'hb' : 'h' + (i + 1);
      legacy.heroes[hid] = { id:hid, sourceId:h.id, name:h.name, hp:h.hp, maxHp:h.maxHp, atk:h.atk, def:h.def, shield:h.shield||0, pos:normalizePos(h.position, {r:6,c:Math.min(3,i)}), unitId:'unit_'+hid, _acted:false };
      legacy.ownedUnits.push({ instanceId:'unit_'+hid, defId:h.petId, level:1, hp:h.hp, maxHp:h.maxHp, pos:normalizePos(h.position,{r:6,c:Math.min(3,i)}), active:true });
      const els = h.shape?.slotElements?.length ? h.shape.slotElements : [h.element,h.element,h.element];
      for(let s=0;s<3;s++) legacy.slots.push({ id:legacy.slots.length, idx:legacy.slots.length, hid, el:LEGACY_EL[els[s] || h.element] || 'fire', sn:legacyShapeNumber(h.shape), tier:1, dir:'right', used:false, layers:1 });
    });
    (vm.enemies || []).forEach((m, i) => legacy.monsters.push({ id:'m'+i, sourceId:m.id, name:m.name, hp:m.hp, maxHp:m.maxHp, atk:m.atk, def:m.def, shield:m.shield||0, el:LEGACY_EL[m.element] || 'fire', pos:normalizePos(m.position, {r:i%8,c:6+Math.floor(i/8)}), dead:!m.alive }));
    legacy.shopItems.units = (vm.shop?.offers || []).map(o => ({ id:o.offerId, offerId:o.offerId, defId:o.petId, cost:o.price, frozen:!!o.frozen }));
    return legacy;
  }
  function normalizePos(pos, fallback){
    if(!pos) return Object.assign({}, fallback);
    return { r: Number(pos.r ?? pos.row ?? fallback.r), c: Number(pos.c ?? pos.col ?? fallback.c) };
  }
  function syncLegacyState(){
    const vm = state.vm;
    if(!vm) return null;
    ensureLegacyTables(vm);
    const legacy = mapLegacyG(vm);
    try { G = legacy; } catch(_) {}
    ROOT.G = legacy;
    return legacy;
  }

  function renderAll(){
    const vm = state.vm;
    if(!vm) return;
    renderTop(vm); renderBoard(vm); renderHeroes(vm); renderSlots(vm); renderEvents(vm); renderShopCompat(vm); renderReports(vm);
  }
  function renderTop(vm){
    const phaseMap = { init:'阶段: 初始', battle_end:'阶段: 战斗结束', shop:'阶段: 商店', day_end:'阶段: 结算' };
    if($('tb-phase')) $('tb-phase').textContent = phaseMap[vm.phase] || ('阶段: '+vm.phase);
    if($('tb-day')) $('tb-day').textContent = vm.day || 1;
    if($('tb-wave')) $('tb-wave').textContent = Math.max(1, vm.round || 1);
    if($('tb-maxwave')) $('tb-maxwave').textContent = vm.maxRounds || 10;
    if($('tb-rc')) $('tb-rc').textContent = vm.phase === 'shop' ? '商店中' : `第${Math.max(1, vm.round || 1)}/${vm.maxRounds || 10}回合`;
    if($('gold')) $('gold').textContent = vm.gold || 0;
    if($('sg')) $('sg').textContent = vm.gold || 0;
    if($('ph')) $('ph').textContent = vm.phase === 'shop' ? '🛒 商店阶段' : (vm.result ? '🏁 战斗结束' : '⚔️ 玩家回合');
    if($('rc')) $('rc').textContent = `第${vm.day || 1}天${vm.period || '上午'} · ${vm.phase}`;
    const playerLeader = vm.leaders?.player || { hp: Math.max(0,(vm.castleLine||10)*8), maxHp:80 };
    const enemyLeader = vm.leaders?.enemy || { hp:0, maxHp:80 };
    if($('p-castle-txt')) $('p-castle-txt').textContent = `${playerLeader.hp}/${playerLeader.maxHp}`;
    if($('p-castle-bar')) $('p-castle-bar').style.width = pct(playerLeader.hp,playerLeader.maxHp)+'%';
    if($('e-castle-txt')) $('e-castle-txt').textContent = `${enemyLeader.hp}/${enemyLeader.maxHp}`;
    if($('e-castle-bar')) $('e-castle-bar').style.width = pct(enemyLeader.hp,enemyLeader.maxHp)+'%';
    if($('etb')) { $('etb').disabled = false; $('etb').textContent = vm.phase === 'init' ? '⚔ 开始战斗' : '⚔ 自动推进战斗'; }
  }
  function renderBoard(vm){
    const board = $('board'); if(!board) return;
    const unitById = new Map();
    [vm.leaders?.player, vm.leaders?.enemy].filter(Boolean).forEach(u => unitById.set(u.id, u));
    (vm.heroes || []).forEach(u => unitById.set(u.id, u));
    (vm.enemies || []).forEach(u => unitById.set(u.id, u));
    const cells = vm.board?.cells || [];
    board.innerHTML = cells.map(cell => {
      const unit = cell.unitId ? unitById.get(cell.unitId) || { id:cell.unitId, name:cell.unitName, displayName:cell.unitName, side:cell.unitSide, hp:null, maxHp:null } : null;
      const sel = state.selectedCell && state.selectedCell.r === cell.r && state.selectedCell.c === cell.c;
      const isPlayerLeader = unit && unit.id === vm.leaders?.player?.id;
      const isEnemyLeader = unit && unit.id === vm.leaders?.enemy?.id;
      const camp = unit?.camp || (cell.unitSide === 'enemy' || cell.unitSide === 'boss' ? 'enemy' : 'player');
      const cls = camp === 'player' ? 'ib-e ib-h ib-ha' : 'ib-e ib-m';
      const icon = isPlayerLeader ? '🛡' : isEnemyLeader ? '👑' : camp === 'player' ? '🧙' : '👾';
      const hp = unit && unit.hp !== null ? ` ${unit.hp}/${unit.maxHp}` : '';
      const terrain = terrainText(cell);
      const elements = elementText(cell);
      const info = cell.preview ? '预览' : cell.threat ? `威胁${cell.threat.damage || cell.threat.threat || ''}` : '';
      const body = unit
        ? `<div class="${cls}"><span>${icon}</span></div><div class="ib-strip">${esc(unit.displayName || unit.name)}${hp}</div>`
        : '<span class="ib-empty">·</span>';
      return `<div class="cell ${sel?'sel':''}" data-r="${cell.r}" data-c="${cell.c}">${body}${terrain}${elements}${info?`<div class="ib-strip">${esc(info)}</div>`:''}</div>`;
    }).join('');
    Array.from(board.querySelectorAll('.cell')).forEach(el => el.onclick = () => {
      const cell={ r:Number(el.dataset.r), c:Number(el.dataset.c) };
      state.selectedCell=cell;
      runCommand('SELECT_CELL', cell)
        .then(() => {
          if(state.selectedHero && state.selectedSlot === null && state.vm?.phase === 'player_turn') return runCommand('MOVE_HERO', { unitId: state.selectedHero, to: cell });
          return null;
        })
        .catch(showError);
    });
  }
  function elementText(cell){
    const els = cell.elements || {};
    const parts = Object.keys(els).filter(k => Number(els[k]) > 0).map(k => `${EL_ICON[k] || ''}${k}${els[k]}`);
    return parts.length ? `<div class="ib-strip">元素 ${esc(parts.join(' '))}</div>` : '';
  }
  function terrainText(cell){
    const mods = cell.terrain?.modules || [];
    if(!mods.length) return '';
    const groups = {};
    mods.forEach(m => { const k = m.element || '?'; groups[k] = (groups[k] || 0) + Number(m.layers || 1); });
    const text = Object.keys(groups).map(k => `${EL_ICON[k] || ''}${k}${groups[k]}`).join(' ');
    return `<div class="ib-strip">地形 ${esc(text)}</div>`;
  }
  function renderHeroes(vm){
    const hs = $('hs'); if(!hs) return;
    hs.style.display = 'flex';
    hs.innerHTML = (vm.heroes || []).map((h,i) => `<div class="hero-card${state.selectedHero===h.id?' sel':''}" data-hid="${esc(h.id)}">
      <div class="hc-portrait">${EL_ICON[h.element] || '🧙'}</div>
      <div class="hc-nameline"><span class="hc-name">我方${esc(h.name)}</span><span class="hc-lv">Lv.1</span></div>
      <div class="hc-hp-row"><span class="hc-hp-icon">♥</span><span class="hc-hp-txt">${h.hp}/${h.maxHp}</span><div class="hc-hpbar"><div class="hc-hpfill" style="width:${pct(h.hp,h.maxHp)}%;background:#c84040"></div></div></div>
      <span class="hc-type">${esc(h.role || '')} · ${esc(h.element || '')}</span><div class="hc-coord">📍 (${normalizePos(h.position,{r:0,c:0}).r},${normalizePos(h.position,{r:0,c:0}).c})</div>
    </div>`).join('');
    Array.from(hs.querySelectorAll('.hero-card')).forEach(el => el.onclick = () => { state.selectedHero = el.dataset.hid; runCommand('SELECT_UNIT', { unitId: el.dataset.hid }).catch(showError); });
  }
  function renderSlots(vm){
    const asl = $('asl'); if(!asl) return;
    let idx = 0;
    asl.innerHTML = (vm.heroes || []).map((h,hi) => {
      const els = h.shape?.slotElements?.length ? h.shape.slotElements : [h.element,h.element,h.element];
      const slots = els.slice(0,3).map((el,si) => {
        const myIdx = idx++;
        return `<div class="as-card${state.selectedSlot===myIdx?' sel':''}" data-slot="${myIdx}" style="--slot-color:#8a6944">
          <span class="as-num">${si+1}</span><div class="as-meta"><span class="as-el">${EL_ICON[el] || ''}${esc(el)}符文</span><span class="as-layer">灌注 1 层</span></div>
          <span class="as-shape">${esc(h.shape?.shapeName || '单点')}</span><div class="as-controls">
            ${['up','left','right','down'].map(d => `<button class="as-dir-btn" data-slot-dir="${myIdx}" data-dir="${d}">${esc(({up:'↑',left:'←',right:'→',down:'↓'})[d])}</button>`).join('')}
            <button class="as-use-btn" data-use="${myIdx}">⚔</button>
          </div></div>`;
      }).join('');
      return `<div class="asl-hero-group"><div class="asl-hero-label">${EL_ICON[h.element] || '◆'} ${esc(h.name)}</div>${slots}</div>`;
    }).join('');
    if($('slot-count')) $('slot-count').textContent = `(${idx}/${idx})`;
    Array.from(asl.querySelectorAll('[data-slot]')).forEach(el => el.onclick = () => { state.selectedSlot = Number(el.dataset.slot); const info=slotToActor(state.selectedSlot); runCommand('SELECT_SLOT', { unitId: info.unitId, slotId: info.localSlot }).catch(showError); });
    Array.from(asl.querySelectorAll('[data-slot-dir]')).forEach(el => el.onclick = (e) => { e.stopPropagation(); const idx=Number(el.dataset.slotDir); state.selectedSlot=idx; const info=slotToActor(idx); runCommand('SET_ACTION_DIRECTION', { unitId: info.unitId, slotId: info.localSlot, dir: el.dataset.dir }).catch(showError); });
    Array.from(asl.querySelectorAll('[data-use]')).forEach(el => el.onclick = (e) => { e.stopPropagation(); ROOT.useSlot(Number(el.dataset.use)); });
  }
  function renderEvents(vm){
    const log = $('log'); if(!log) return;
    const evs = (vm.events || []).slice(-20);
    log.innerHTML = evs.map(e => `<div>${esc(e.text || e.type)}</div>`).join('') || '<div>等待玩家操作。</div>';
    log.scrollTop = log.scrollHeight;
  }
  function renderShopCompat(vm){
    if($('sg')) $('sg').textContent = vm.gold || 0;
    const scat = $('scat'); if(!scat) return;
    const offers = vm.shop?.offers || [];
    const events = vm.shop?.events || [];
    let html = `<div class="shop-grid"><div class="shop-col"><div class="sstt">🛒 商品</div>`;
    if(!offers.length) html += '<div class="shop-note">暂无商品，点击商店或刷新。</div>';
    html += offers.map(o => `<div class="shop-card ${o.frozen?'frozen':''}"><div class="shop-card-title">${o.frozen?'❄️ ':''}${esc(o.name)}</div><div class="shop-card-meta">${esc(o.element||'')} · ${esc(o.role||'')} · ${esc(o.poolTier||'')}</div><div class="shop-card-price">💰 ${o.price}</div><button onclick="buyUnit('${esc(o.offerId)}')">购买</button><button onclick="freezeShopItem('${esc(o.offerId)}','units')">${o.frozen?'解冻':'冻结'}</button></div>`).join('');
    html += `</div><div class="shop-col"><div class="sstt">⚙ 操作</div><button class="rsb" onclick="rollShop()">🔄 刷新商店</button><button class="rsb" onclick="refreshShop()">刷新别名</button><div class="sstt">商店事件</div>`;
    html += events.map(e => `<div class="shop-card"><div class="shop-card-title">${esc(e.name)}</div><div class="shop-card-meta">${esc(e.optionText||'')}</div><button onclick="applyShopEventCompat('${esc(e.id)}')">选择</button></div>`).join('') || '<div class="shop-note">暂无可用事件。</div>';
    html += `</div></div>`;
    scat.innerHTML = html;
  }
  function renderReports(vm){
    const dock = $('debug-dock') || $('debug-panel');
    if(dock){
      dock.innerHTML = `<div class="debug-title">新核心适配层</div><div>数据：宠${vm.meta?.pets} / 怪${vm.meta?.monsters} / 商店${vm.meta?.shop}</div><div>阶段：${esc(vm.phase)} · 金币 ${vm.gold}</div><div class="compat-badge">控制台：await __YSBZS__.snapshot()</div>`;
    }
  }


  function slotToActor(globalIdx){
    let cursor = 0;
    for(const h of state.vm?.heroes || []){
      const count = Math.max(1, (h.slots && h.slots.length) || 3);
      if(globalIdx < cursor + count) return { unitId:h.id, localSlot:globalIdx-cursor };
      cursor += count;
    }
    return { unitId: state.selectedHero || state.vm?.heroes?.[0]?.id, localSlot: Number(globalIdx)||0 };
  }

  function showShop(){ const so=$('so'); if(so) so.style.display='block'; }
  function hideShop(){ const so=$('so'); if(so) so.style.display='none'; }
  function showError(err){ console.error(err); logLine('⚠️ '+(err.message||err)); }

  function installGlobals(){
    ROOT.__YSBZS__ = {
      view: refreshFromView,
      snapshot: refreshSnapshot,
      report: (mode='player') => refreshReport(mode),
      shopReport: () => refreshReport('shop'),
      dataSummary: () => api('/api/data/summary'),
      command: (type, payload={}) => runCommand(type, payload),
      refresh: async () => { await refreshFromView(); renderAll(); return state.vm; },
      get lastViewModel(){ return state.vm; },
      get lastReport(){ return state.report; },
      get legacyGameState(){ return (typeof G !== 'undefined' ? G : ROOT.G); }
    };
    ROOT.initGame = function(){ newGame({ day:1, period:'上午', gold:8 }).catch(showError); };
    ROOT.restartRun = function(){ newGame({ day:1, period:'上午', gold:8 }).catch(showError); };
    ROOT.refreshUI = function(){ refreshFromView().then(renderAll).catch(showError); };
    ROOT.render = ROOT.refreshUI;
    ROOT.renderShop = function(){ if(state.vm) renderShopCompat(state.vm); };
    ROOT.openShop = function(){ runCommand('ENTER_SHOP', { poolId:'night_base', slots:6 }).then(showShop).catch(showError); };
    ROOT.closeShop = function(){ runCommand('EXIT_SHOP').then(hideShop).catch(showError); };
    ROOT.rollShop = function(){ runCommand('ROLL_SHOP', { slots:6 }).catch(showError); };
    ROOT.refreshShop = ROOT.rollShop;
    ROOT.buyUnit = function(itemId){ runCommand('BUY_OFFER', { offerId:itemId }).catch(showError); };
    ROOT.freezeShopItem = function(itemId){
      const offer = state.vm?.shop?.offers?.find(o => o.offerId === itemId);
      runCommand(offer && offer.frozen ? 'UNFREEZE_OFFER' : 'FREEZE_OFFER', { offerId:itemId }).catch(showError);
    };
    ROOT.applyShopEventCompat = function(eventId){ runCommand('APPLY_SHOP_EVENT', { eventId }).catch(showError); };
    ROOT.sellUnit = function(instanceId){ runCommand('SELL_UNIT', { instanceId }).catch(showError); };
    ROOT.toggleUnitActive = function(instanceId){ runCommand('TOGGLE_UNIT_ACTIVE', { instanceId }).catch(showError); };
    ROOT.selHero = function(id){ state.selectedHero = id === state.selectedHero ? null : id; runCommand('SELECT_UNIT', { unitId: state.selectedHero }).catch(showError); };
    ROOT.moveHero = function(r,c){ const cell={r:Number(r),c:Number(c)}; state.selectedCell=cell; runCommand('MOVE_HERO', { unitId: state.selectedHero, to: cell }).catch(showError); };
    ROOT.selSlot = function(idx){ state.selectedSlot = Number(idx); const info=slotToActor(state.selectedSlot); runCommand('SELECT_SLOT', { unitId: info.unitId, slotId: info.localSlot }).catch(showError); };
    ROOT.setDir = function(idx, dir){ state.selectedSlot = Number(idx); const info=slotToActor(state.selectedSlot); runCommand('SET_ACTION_DIRECTION', { unitId: info.unitId, slotId: info.localSlot, dir }).catch(showError); };
    ROOT.setHero = function(idx, hid){ state.selectedHero = hid; state.selectedSlot = Number(idx); runCommand('SELECT_UNIT', { unitId: hid }).catch(showError); };
    ROOT.useSlot = function(idx){ state.selectedSlot = Number(idx); const info=slotToActor(state.selectedSlot); runCommand('USE_SLOT', { unitId: info.unitId, slotId: info.localSlot, cell: state.selectedCell }).catch(showError); };
    ROOT.runAiBattleTurn = function(){ runCommand('RUN_MONSTER_TURN').catch(showError); };
    ROOT.endPlayerTurn = function(){
      const type = state.vm?.phase === 'init' ? 'START_BATTLE' : 'END_PLAYER_TURN';
      runCommand(type).catch(showError);
    };
    if(!ROOT.toggleFullscreen){ ROOT.toggleFullscreen = function(){ const el=$('game-shell')||document.documentElement; if(document.fullscreenElement) document.exitFullscreen(); else if(el.requestFullscreen) el.requestFullscreen(); }; }
  }
  async function boot(){
    installGlobals();
    try { await refreshFromView(); await refreshReport('player').catch(()=>null); renderAll(); state.ready=true; logLine('✅ 新核心已接管原 UI：CSV 数据源 → uiAdapter → 原 UI 展示。'); }
    catch(err){ showError(err); }
  }
  function waitOldThenBoot(){
    let n = 0;
    const timer = setInterval(() => {
      n++;
      if(n > 100 || document.readyState === 'complete' || typeof ROOT.refreshUI === 'function'){
        clearInterval(timer);
        boot();
      }
    }, 50);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitOldThenBoot);
  else waitOldThenBoot();
})();
