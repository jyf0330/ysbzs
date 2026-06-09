export const $ = (id) => document.getElementById(id);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(v) {
  return String(v ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));
}

export function pct(n, d) {
  return Math.max(0, Math.min(100, Math.round((Number(n || 0) / Math.max(1, Number(d || 1))) * 100)));
}
