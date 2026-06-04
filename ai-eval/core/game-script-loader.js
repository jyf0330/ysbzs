const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl() {
  return {
    innerHTML: '',
    textContent: '',
    style: { display: '' },
    children: [],
    disabled: false,
    scrollTop: 0,
    scrollHeight: 0,
    classList: { add() {}, remove() {}, has: () => false },
    appendChild(c) { this.children.push(c); },
    removeChild(c) {
      const i = this.children.indexOf(c);
      if (i >= 0) this.children.splice(i, 1);
    },
    getBoundingClientRect() { return { top: 0, left: 0, right: 0, bottom: 0 }; },
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    onclick: null,
    title: '',
  };
}

function createDomStub() {
  const els = {};
  return {
    getElementById(id) {
      if (!els[id]) els[id] = makeEl();
      return els[id];
    },
    createElement() {
      return makeEl();
    },
    addEventListener() {},
    _els: els,
  };
}

function extractGameScript(html) {
  const scriptTag = html.match(/<script\b[^>]*>([\s\S]+?)<\/script>/i);
  if (!scriptTag) throw new Error('Cannot find inline game <script>');
  return scriptTag[1];
}

function loadMultiFileScripts(rootDir) {
  const files = [
    'data.js', 'externalDataAdapter.js',
    'rng.js', 'board.js', 'actions.js', 'elements.js',
    'damage.js', 'waves.js', 'battle.js', 'terrain.js', 'battleLog.js',
    'shop.js', 'game.js', 'preview.js', 'ui.js'
  ];
  const scripts = [];
  for (const f of files) {
    const p = path.join(rootDir, f);
    if (!fs.existsSync(p)) return null; // fallback to single-file
    scripts.push(fs.readFileSync(p, 'utf8'));
  }
  return scripts;
}

function createExportFooter() {
  return `
;(function exportYsbzsBindings() {
  try { if (typeof initGame !== 'undefined') globalThis.initGame = initGame; } catch (e) {}
  try { if (typeof dispatchGameAction !== 'undefined') globalThis.dispatchGameAction = dispatchGameAction; } catch (e) {}
  try { if (typeof snapshotCoreStateForReplay !== 'undefined') globalThis.snapshotCoreStateForReplay = snapshotCoreStateForReplay; } catch (e) {}
  try { if (typeof applyReplaySnapshot !== 'undefined') globalThis.applyReplaySnapshot = applyReplaySnapshot; } catch (e) {}
  try { if (typeof buildReplayFinalResult !== 'undefined') globalThis.buildReplayFinalResult = buildReplayFinalResult; } catch (e) {}
  try { if (typeof render !== 'undefined') globalThis.render = render; } catch (e) {}
  try { if (typeof renderShop !== 'undefined') globalThis.renderShop = renderShop; } catch (e) {}
  try { if (typeof glog !== 'undefined') globalThis.glog = glog; } catch (e) {}
  try { if (typeof showMsg !== 'undefined') globalThis.showMsg = showMsg; } catch (e) {}
  try { if (typeof buildRunEndVM !== 'undefined') globalThis.buildRunEndVM = buildRunEndVM; } catch (e) {}
  try { if (typeof recomputeCorePreview !== 'undefined') globalThis.recomputeCorePreview = recomputeCorePreview; } catch (e) {}
  try { if (typeof execAllHeroSlots !== 'undefined') globalThis.execAllHeroSlots = execAllHeroSlots; } catch (e) {}
  try { if (typeof endPlayerTurn !== 'undefined') globalThis.endPlayerTurn = endPlayerTurn; } catch (e) {}
  try { if (typeof closeShop !== 'undefined') globalThis.closeShop = closeShop; } catch (e) {}
  try { if (typeof atkCells !== 'undefined') globalThis.atkCells = atkCells; } catch (e) {}
  try { if (typeof UNIT_DEFS !== 'undefined') globalThis.UNIT_DEFS = UNIT_DEFS; } catch (e) {}
  try { if (typeof EL !== 'undefined') globalThis.EL = EL; } catch (e) {}
  try { if (typeof SHOP_PRICE_CONFIG !== 'undefined') globalThis.SHOP_PRICE_CONFIG = SHOP_PRICE_CONFIG; } catch (e) {}
  try { if (typeof TIER_MULT !== 'undefined') globalThis.TIER_MULT = TIER_MULT; } catch (e) {}
  try { if (typeof ADV !== 'undefined') globalThis.ADV = ADV; } catch (e) {}
  try { if (typeof buyUnit !== 'undefined') globalThis.buyUnit = buyUnit; } catch (e) {}
  try { if (typeof sellUnit !== 'undefined') globalThis.sellUnit = sellUnit; } catch (e) {}
  try { if (typeof freezeItem !== 'undefined') globalThis.freezeItem = freezeItem; } catch (e) {}
  try { if (typeof setHero !== 'undefined') globalThis.setHero = setHero; } catch (e) {}
  try { if (typeof moveHero !== 'undefined') globalThis.moveHero = moveHero; } catch (e) {}
  try { if (typeof selSlot !== 'undefined') globalThis.selSlot = selSlot; } catch (e) {}
  try { if (typeof setDir !== 'undefined') globalThis.setDir = setDir; } catch (e) {}
  try { if (typeof hasCrossExplosion !== 'undefined') globalThis.hasCrossExplosion = hasCrossExplosion; } catch (e) {}
  try { if (typeof spawnSummon !== 'undefined') globalThis.spawnSummon = spawnSummon; } catch (e) {}
  try { if (typeof killSummon !== 'undefined') globalThis.killSummon = killSummon; } catch (e) {}
  try { if (typeof dealDmg !== 'undefined') globalThis.dealDmg = dealDmg; } catch (e) {}
  try { if (typeof addOwnedUnit !== 'undefined') globalThis.addOwnedUnit = addOwnedUnit; } catch (e) {}
  try { if (typeof removeOwnedUnit !== 'undefined') globalThis.removeOwnedUnit = removeOwnedUnit; } catch (e) {}
  try { if (typeof setEmptyCell !== 'undefined') globalThis.setEmptyCell = setEmptyCell; } catch (e) {}
  try { if (typeof fresh !== 'undefined') globalThis.fresh = fresh; } catch (e) {}
  try { if (typeof heroAt !== 'undefined') globalThis.heroAt = heroAt; } catch (e) {}
  try { if (typeof monAt !== 'undefined') globalThis.monAt = monAt; } catch (e) {}
  try { if (typeof summonAt !== 'undefined') globalThis.summonAt = summonAt; } catch (e) {}
  try { if (typeof castleAt !== 'undefined') globalThis.castleAt = castleAt; } catch (e) {}
  try { if (typeof hasElementAt !== 'undefined') globalThis.hasElementAt = hasElementAt; } catch (e) {}
  try { if (typeof calcElementLayerDamage !== 'undefined') globalThis.calcElementLayerDamage = calcElementLayerDamage; } catch (e) {}
  try { if (typeof commitPlayerActionsToElementField !== 'undefined') globalThis.commitPlayerActionsToElementField = commitPlayerActionsToElementField; } catch (e) {}
  try { if (typeof buildPreviewGrid !== 'undefined') globalThis.buildPreviewGrid = buildPreviewGrid; } catch (e) {}
  try { if (typeof buildBattleReport !== 'undefined') globalThis.buildBattleReport = buildBattleReport; } catch (e) {}
  try { if (typeof buildHeroStats !== 'undefined') globalThis.buildHeroStats = buildHeroStats; } catch (e) {}
  try { if (typeof buildMonsterStats !== 'undefined') globalThis.buildMonsterStats = buildMonsterStats; } catch (e) {}
  try { if (typeof buildMonsterThreats !== 'undefined') globalThis.buildMonsterThreats = buildMonsterThreats; } catch (e) {}
  try {
    if (typeof G !== 'undefined') {
      var _gVal = G;
      Object.defineProperty(globalThis, 'G', {
        configurable: true,
        enumerable: true,
        get() { return _gVal; },
        set(value) { _gVal = value; },
      });
    }
  } catch (e) {}
})();
`;
}

function loadYsbzsGame(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..', '..');
  const htmlPath = options.htmlPath || path.join(rootDir, 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const context = {
    console,
    document: createDomStub(),
    window: { innerWidth: 1920 },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    location: { search: '' },
    setTimeout(fn) {
      try { fn(); } catch (e) { throw e; }
      return 0;
    },
    clearTimeout() {},
    __TEST__: true,
    __DEBUG__: false,
    __YSBZS_ROOT__: rootDir,
    require,
    __dirname: rootDir,
    process,
  };
  context.global = context;
  vm.createContext(context);

  // 检测多文件模式：data.js + game.js + ui.js 存在则用多文件
  const multiScripts = loadMultiFileScripts(rootDir);
  if (multiScripts) {
    const footer = createExportFooter();
    // data.js 和 game.js 用 var 声明提升到 context，ui.js 也一样
    const combined = multiScripts.map(s =>
      s.replace(/^#!.*\n/, '').replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var')
    ).join('\n;\n') + '\n' + footer;
    vm.runInContext(combined, context, { filename: 'multi-file-bundle' });
  } else {
    // 单文件模式：从 index.html 内联 script 提取
    const scriptContent = extractGameScript(html);
    const footer = createExportFooter();
    vm.runInContext(
      `${scriptContent.replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var')}\n${footer}`,
      context,
      { filename: htmlPath }
    );
  }

  context.render = () => {};
  context.renderShop = () => {};
  context.glog = () => {};
  context.showMsg = () => {};
  if (typeof context.buildRunEndVM === 'function') {
    context.showRunEnd = () => context.buildRunEndVM().title;
  }

  return { context, rootDir, htmlPath };
}

module.exports = { loadYsbzsGame, extractGameScript };
