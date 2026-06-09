function stableKey(value) {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return String(value);
  try { return JSON.stringify(value); }
  catch (_) { return Object.prototype.toString.call(value); }
}

export function createRenderCache() {
  const keys = new Map();
  return {
    shouldRender(name, value) {
      const next = stableKey(value);
      if (keys.get(name) === next) return false;
      keys.set(name, next);
      return true;
    },
    invalidate(name = null) {
      if (name) keys.delete(name);
      else keys.clear();
    }
  };
}
