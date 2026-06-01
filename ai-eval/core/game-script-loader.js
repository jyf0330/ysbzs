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
  try { if (typeof UNIT_DEFS !== 'undefined') globalThis.UNIT_DEFS = UNIT_DEFS; } catch (e) {}
  try { if (typeof EL !== 'undefined') globalThis.EL = EL; } catch (e) {}
  try { if (typeof SHOP_PRICE_CONFIG !== 'undefined') globalThis.SHOP_PRICE_CONFIG = SHOP_PRICE_CONFIG; } catch (e) {}
  try { if (typeof TIER_MULT !== 'undefined') globalThis.TIER_MULT = TIER_MULT; } catch (e) {}
  try { if (typeof ADV !== 'undefined') globalThis.ADV = ADV; } catch (e) {}
  try {
    if (typeof G !== 'undefined') {
      Object.defineProperty(globalThis, 'G', {
        configurable: true,
        enumerable: true,
        get() { return G; },
        set(value) { G = value; },
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
  };
  context.global = context;
  vm.createContext(context);
  vm.runInContext(`${extractGameScript(html)}\n${createExportFooter()}`, context, { filename: htmlPath });

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
