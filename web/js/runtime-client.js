const LOCAL_RUNTIME_QUERY = 'runtime=local';
const HTTP_RUNTIME_QUERY = 'runtime=http';
const DEFAULT_SAVE_SLOT = 'ysbzs.save.slot1';

function getWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function getPlayerId(option) {
  return typeof option === 'function' ? option() : (option || 'p1');
}

function endpoint(apiBase, pathname) {
  if (!apiBase) return pathname;
  const cleanBase = String(apiBase).replace(/\/$/, '');
  const cleanPath = String(pathname || '').replace(/^\/api/, '');
  return `${cleanBase}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

function engineMissing(method) {
  throw new Error(`LOCAL_RUNTIME_ENGINE_MISSING: ${method}`);
}

export function resolveRuntimeMode(options = {}) {
  if (options.mode) return options.mode;
  const win = getWindow();
  if (!win) return 'local';
  const params = new URLSearchParams(win.location?.search || '');
  if (params.get('runtime') === 'http' || (win.location?.search || '').includes(HTTP_RUNTIME_QUERY)) return 'http';
  if (params.get('runtime') === 'local' || (win.location?.search || '').includes(LOCAL_RUNTIME_QUERY)) return 'local';
  if (win.__YSBZS_RUNTIME_MODE__) return win.__YSBZS_RUNTIME_MODE__;
  return 'local';
}

export function resolveApiBase(options = {}) {
  if (options.apiBase != null) return options.apiBase;
  const win = getWindow();
  if (!win) return '';
  if (win.__YSBZS_API_BASE__ != null) return win.__YSBZS_API_BASE__;
  return win.location?.pathname?.startsWith('/ysbzs/') ? '/ysbzs-api' : '';
}

export function createHttpRuntime(options = {}) {
  const apiBase = resolveApiBase(options);
  const playerId = options.playerId || 'p1';
  async function request(pathname, body) {
    const currentPlayerId = getPlayerId(playerId);
    const res = await fetch(endpoint(apiBase, pathname), {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json', 'x-player-id': currentPlayerId } : { 'x-player-id': currentPlayerId },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  return {
    kind: 'http',
    request,
    view() { return request('/api/view'); },
    report(mode = 'player') { return request(`/api/report?mode=${encodeURIComponent(mode)}`); },
    action(command) { return request('/api/action', command); },
    save() { return request('/api/save'); },
    load(save) { return request('/api/load', { save }); }
  };
}

export function createLocalRuntime(options = {}) {
  const win = getWindow();
  const existingEngine = options.engine || win?.__YSBZS_LOCAL_ENGINE__ || null;
  const factory = options.engineFactory || win?.__YSBZS_LOCAL_ENGINE_FACTORY__ || null;
  const engine = existingEngine || (typeof factory === 'function' ? factory(options) : null);
  if (win && engine && !win.__YSBZS_LOCAL_ENGINE__) win.__YSBZS_LOCAL_ENGINE__ = engine;
  const storage = options.storage || win?.localStorage || null;
  const slotKey = options.slotKey || DEFAULT_SAVE_SLOT;
  const playerId = options.playerId || 'p1';
  function currentPlayerId() { return getPlayerId(playerId); }
  async function view() {
    if (engine?.view) return engine.view(currentPlayerId());
    if (engine?.getViewModel) return { ok: true, viewModel: engine.getViewModel(currentPlayerId()) };
    engineMissing('view');
  }
  async function report(mode = 'player') {
    if (engine?.report) return engine.report(mode, currentPlayerId());
    if (engine?.getTextReport) return { ok: true, report: engine.getTextReport(mode, currentPlayerId()) };
    engineMissing('report');
  }
  async function action(command) {
    if (engine?.action) return engine.action(command);
    if (engine?.run) return engine.run(command);
    engineMissing('action');
  }
  async function save() {
    if (engine?.save) return engine.save(currentPlayerId());
    if (engine?.exportSave) return { ok: true, save: engine.exportSave(currentPlayerId()) };
    engineMissing('save');
  }
  async function load(saveDoc) {
    if (engine?.load) return engine.load(saveDoc, currentPlayerId());
    if (engine?.importSave) return engine.importSave(saveDoc, currentPlayerId());
    engineMissing('load');
  }
  async function request(pathname, body) {
    if (pathname === '/api/view') return view();
    if (pathname.startsWith('/api/report')) return report(new URL(pathname, 'http://local').searchParams.get('mode') || 'player');
    if (pathname === '/api/action') return action(body);
    if (pathname === '/api/save') {
      const data = await save();
      if (storage && data?.save) storage.setItem(slotKey, JSON.stringify(data.save));
      return data;
    }
    if (pathname === '/api/load') return load(body?.save || body);
    if (pathname === '/api/data/summary' && engine?.getDataSummary) {
      return {
        ok: true,
        summary: engine.getDataSummary(),
        shopPools: engine.getShopPools ? engine.getShopPools() : [],
        rewardPools: engine.getRewardPools ? engine.getRewardPools() : []
      };
    }
    engineMissing(`request:${pathname}`);
  }
  return { kind: 'local', request, view, report, action, save, load };
}

export function createGameRuntime(options = {}) {
  return resolveRuntimeMode(options) === 'local'
    ? createLocalRuntime(options)
    : createHttpRuntime(options);
}
