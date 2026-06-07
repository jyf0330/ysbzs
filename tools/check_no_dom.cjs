const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..','src'); const bad=[]; const tokens=['document.','querySelector','innerHTML','classList','addEventListener','requestAnimationFrame','requestFullscreen','window.','renderBoard','refreshUI'];
function walk(d){ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); const st=fs.statSync(p); if(st.isDirectory()) walk(p); else if(p.endsWith('.cjs')){ const s=fs.readFileSync(p,'utf8'); for(const t of tokens) if(s.includes(t)) bad.push(`${p}: ${t}`); } } }
walk(root); if(bad.length){ console.error(bad.join('\n')); process.exit(1); } console.log(`PASS no DOM/UI calls in src`);
