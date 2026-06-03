/**
 * 元素背包史 · 框架常量
 * 只保留框架级常量，所有策划数据从 external-data/generated-json 读取。
 * JSON 读取适配层在 externalDataAdapter.js。
 * Legacy fallback 在 external-data/generated-json/legacy_data.json。
 */

// ========== 元素常量（框架核心，不涉及策划数值） ==========
const EL = {fire:'火',water:'水',wind:'风',earth:'土'};
const EL_ORDER = ['fire','water','wind','earth'];
const ELEMS = ['fire','water','wind','earth'];
const EC = {fire:'#d4855e',water:'#5e95b5',wind:'#6ea86c',earth:'#b8844a'};
const EB = {fire:'#fae8df',water:'#e3eff7',wind:'#e8f3e5',earth:'#f5ede0'};
const ADV = {water:'fire',fire:'wind',wind:'earth',earth:'water'};
const ELICON = {fire:'🔥',water:'💧',wind:'🌬',earth:'🪨'};
const ELNAME = {fire:'火',water:'水',wind:'风',earth:'土'};
const EL_CLASS = {火:'b-el-f',水:'b-el-w',风:'b-el-i',土:'b-el-e'};
const MAX_STK = 6;
