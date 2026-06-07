const { runFullDayScenario } = require('../src/scenarios/fullDay.cjs');
const { renderPlayerReport } = require('../src/render/textReport.cjs');
const state = runFullDayScenario();
const txt = renderPlayerReport(state);
if (process.argv.includes('--check')) { if(!txt.includes('SHOP_BUY') && !txt.includes('购买')) throw new Error('report missing shop buy'); if(!txt.includes('商店刷新')) throw new Error('report missing shop roll'); console.log('PASS full day report check'); } else console.log(txt);
