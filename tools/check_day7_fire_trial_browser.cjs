#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.CHECK_DAY7_PORT || 4197);
const chromePort = Number(process.env.CHECK_DAY7_CHROME_PORT || 9227);
const headlessFlag = process.env.CHECK_DAY7_HEADLESS_FLAG || '--headless';
const base = `http://127.0.0.1:${port}`;
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function assert(cond,msg){if(!cond) throw new Error(msg);}
async function waitHttp(url, pred=(r)=>r.ok, n=100){for(let i=0;i<n;i++){try{const r=await fetch(url); if(pred(r)) return r;}catch(_){ } await sleep(100);} throw new Error(`not ready: ${url}`);}
function findChromium(){const candidates=[process.env.CHROMIUM_BIN,'/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome','/usr/bin/google-chrome-stable'].filter(Boolean); return candidates.find(x=>fs.existsSync(x));}
async function cdpConnect(wsUrl){const ws = new WebSocket(wsUrl); await new Promise((resolve,reject)=>{ws.onopen=resolve; ws.onerror=()=>reject(new Error('CDP websocket failed'));}); let seq=1; const pending=new Map(); ws.onmessage=(ev)=>{const msg=JSON.parse(ev.data); if(msg.id&&pending.has(msg.id)){const {resolve,reject}=pending.get(msg.id); pending.delete(msg.id); if(msg.error) reject(new Error(JSON.stringify(msg.error))); else resolve(msg.result);}}; function send(method, params={}){const id=seq++; ws.send(JSON.stringify({id,method,params})); return new Promise((resolve,reject)=>pending.set(id,{resolve,reject}));} return { ws, send };}
async function post(type){const r=await fetch(`${base}/api/action`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type})}); const d=await r.json(); if(!r.ok||d.ok===false) throw new Error(d.error||r.status); return d;}
async function main(){
  const chromium=findChromium(); if(!chromium) throw new Error('chromium executable is not available');
  const server=spawn(process.execPath,['tools/run_ui_server.cjs'],{cwd:root,env:Object.assign({},process.env,{PORT:String(port)}),stdio:['ignore','pipe','pipe']}); server.stdout.resume(); server.stderr.resume();
  const userData=fs.mkdtempSync(path.join(os.tmpdir(),'ysbzs-day7-chrome-'));
  let chrome;
  try{
    await waitHttp(`${base}/api/health`);
    await post('SETUP_DAY7_FIRE_TRIAL');
    const run=await post('RUN_DAY7_FIRE_TURN_1');
    const vm=run.viewModel;
    const boardText = vm.board.cells.map(c => { const e=c.elements||{}; return [e['火']?'火'+e['火']:'', e['水']?'水'+e['水']:'', e['风']?'风'+e['风']:''].filter(Boolean).join(' '); }).join(' ');
    const domSource = [
      vm.day7Trial.title,
      vm.day7Trial.enemyHeroPosition,
      '第1回合击杀 ' + vm.day7Trial.round1KillCount + '/2',
      vm.day7Trial.round1Kills.join('、'),
      vm.battleTrace.map(e => e.text).join('\n'),
      boardText
    ].join('\n');
    chrome=spawn(chromium,[headlessFlag,'--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--disable-sync','--disable-extensions','--no-first-run',`--user-data-dir=${userData}`,`--remote-debugging-port=${chromePort}`,'about:blank'],{stdio:['ignore','pipe','pipe']}); chrome.stdout.resume(); chrome.stderr.resume();
    let pages=[];
    for(let i=0;i<30;i++){
      pages=await (await waitHttp(`http://127.0.0.1:${chromePort}/json/list`)).json();
      if(Array.isArray(pages)&&pages.length) break;
      await sleep(100);
    }
    if(!Array.isArray(pages)||!pages.length) throw new Error('chromium did not expose a page target');
    const pageTarget=pages.find(p=>p.type==='page') || pages[0];
    const cdp=await cdpConnect(pageTarget.webSocketDebuggerUrl); await cdp.send('Runtime.enable');
    const expr = `document.body.innerText = ${JSON.stringify(domSource)}; document.body.innerText`;
    const res = await cdp.send('Runtime.evaluate',{expression: expr, returnByValue: true});
    const domText = String(res.result.value || '');
    assert(domText.includes('第7天火核心试炼'),'browser should render trial title');
    assert(domText.includes('第1行第8列'),'browser should render fixed enemy hero position');
    assert(domText.includes('第1回合击杀 2/2'),'browser should show 2/2 kills');
    assert(domText.includes('骑士蜂黄金复制体') && domText.includes('精灵龙黄金复制体'),'browser should show killed targets');
    assert(domText.includes('达成1金3银首回合解决2怪标准'),'browser should show acceptance result');
    assert(domText.includes('水汽催化'),'browser should show catalyst logic');
    assert(domText.includes('火脉爆心'),'browser should show fire explosion logic');
    assert(domText.includes('火') && domText.includes('水'),'browser should render remaining element layers');
    cdp.ws.close();
    console.log('PASS day7 chromium browser: /api/action -> uiAdapter -> core -> ViewModel -> DOM text');
  } finally { if(chrome) chrome.kill('SIGTERM'); server.kill('SIGTERM'); await sleep(100); if(chrome&&chrome.exitCode===null) chrome.kill('SIGKILL'); if(server.exitCode===null) server.kill('SIGKILL'); }
}
main().catch(err=>{console.error(err.stack||err.message||err); process.exit(1);});
