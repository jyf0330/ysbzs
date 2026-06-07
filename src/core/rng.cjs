function hashSeed(s){ let h=2166136261>>>0; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h>>>0; }
function rng(seed){ let a=hashSeed(seed)||1; return function(){ a|=0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function pickWeighted(items, weightFn, random){ const list=items.filter(x => (weightFn(x)||0) > 0); const total=list.reduce((s,x)=>s+(weightFn(x)||0),0); if (!list.length || total<=0) return null; let r=random()*total; for (const item of list){ r -= weightFn(item)||0; if (r <= 0) return item; } return list[list.length-1]; }
module.exports = { rng, pickWeighted, hashSeed };
