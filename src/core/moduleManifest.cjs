/**
 * moduleManifest.cjs — 模块清单/异步命令包/游戏组件声明
 *
 * 参考：Vassal Engine（模块声明、组件清单）
 * 定位：描述当前游戏模块的能力和使用的开源参考。
 */

const pkg = (() => { try { return require('../../package.json'); } catch (_) { return { version: '0.0.0' }; } })();

const MANIFEST = Object.freeze({
  game: '元素背包史 / ysbzs',
  version: pkg.version || '0.1.0',
  rulesVersion: 'v1',
  dataVersion: '2026-06-08',
  activeElements: ['火', '水', '风'],
  compatElements: ['火', '水', '风', '土'],
  board: { rows: 8, cols: 8 },
  coreModules: [
    { name: 'battle', path: 'src/core/battle.cjs', role: '战斗引擎' },
    { name: 'elements', path: 'src/core/elements.cjs', role: '元素规则/反应' },
    { name: 'elementPackets', path: 'src/core/elementPackets.cjs', role: '元素包（来源追溯）' },
    { name: 'triggerQueue', path: 'src/core/triggerQueue.cjs', role: '触发器队列' },
    { name: 'modifierEngine', path: 'src/core/modifierEngine.cjs', role: '修饰器引擎' },
    { name: 'continuousEffects', path: 'src/core/continuousEffects.cjs', role: '持续效果' },
    { name: 'replacementEffects', path: 'src/core/replacementEffects.cjs', role: '替换效果' },
    { name: 'changeLog', path: 'src/core/changeLog.cjs', role: '变更日志' },
    { name: 'battleEventProtocol', path: 'src/core/battleEventProtocol.cjs', role: '战斗事件协议' },
    { name: 'explainTrace', path: 'src/core/explainTrace.cjs', role: '战报解释器' },
    { name: 'tacticalTargeting', path: 'src/core/tacticalTargeting.cjs', role: '棋盘目标选择' },
    { name: 'actionSpaceAnalyzer', path: 'src/core/actionSpaceAnalyzer.cjs', role: '动作空间分析' },
    { name: 'scenarioRunner', path: 'src/core/scenarioRunner.cjs', role: '预设场景执行' },
    { name: 'unitFactory', path: 'src/core/unitFactory.cjs', role: '单位创建' },
    { name: 'trialEngine', path: 'src/core/trialEngine.cjs', role: '试炼编排' },
    { name: 'mechanics', path: 'src/core/mechanics.cjs', role: '机制注册表' },
    { name: 'state', path: 'src/core/state.cjs', role: '游戏状态' },
    { name: 'reducer', path: 'src/core/reducer.cjs', role: '命令分发' },
    { name: 'csvData', path: 'src/core/csvData.cjs', role: 'CSV 加载' }
  ],
  csvTables: Object.freeze([
    '01_宠物主表', '02_怪物模板', '03_怪物波次', '04_机制词条库',
    '05_事件主表', '06_商店奖励池', '07_遗物祝福', '08_形状行动槽',
    '09_跨表校验', '10_初始阵容', '11_英雄领域', '12_元素反应',
    '13_第7天兽群试炼', '14_品质进阶倍率', '15_召唤试炼题库',
    '16_试炼回合行动计划', '17_试炼胜负规则', '18_效果物体表',
    '19_触发器表', '20_修饰器表', '21_元素包规则', '22_元素转换规则',
    '23_触发排序规则'
  ]),
  openSourceReferences: [
    'boardgame.io', 'Pokémon Showdown', 'Forge / Card-Forge',
    'XMage', 'OpenDuelyst', 'TabletopGames / TAG', 'Vassal'
  ],
  exportFormats: ['replay', 'scenario', 'async_command_package']
});

function getManifest() { return MANIFEST; }

module.exports = { getManifest, MANIFEST };
