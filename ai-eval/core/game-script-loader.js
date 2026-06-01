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
  const scriptTag = html.match(/<script>([\s\S]+?)<\/script>/);
  if (!scriptTag) throw new Error('Cannot find inline game <script>');
  return scriptTag[1].replace(/\bconst\b/g, 'var').replace(/\blet\b/g, 'var');
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
  vm.runInContext(extractGameScript(html), context, { filename: htmlPath });

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
