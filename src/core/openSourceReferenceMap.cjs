/**
 * openSourceReferenceMap.cjs — 7 个开源来源与项目模块的映射说明
 *
 * 准确口径：
 *   boardgame.io 是直接上游底座（不改源码）；
 *   其余 6 个是架构思想/模块设计参考（不复制源码）。
 */

const REFERENCES = Object.freeze([
  {
    id: 'boardgame.io',
    name: 'boardgame.io',
    urls: [
      'https://github.com/boardgameio/boardgame.io',
      'https://boardgame.io/',
      'https://boardgame.io/documentation/'
    ],
    referenceType: 'direct_upstream_base',
    copiedPart: 'upstream/boardgame.io-main 源码不变，ysbzs 包成 boardgame.io Game',
    ysbzsModules: ['upstream/boardgame.io-main', 'apps/ysbzs-boardgameio/src/YSBZSGame.cjs'],
    integrationLevel: 'direct',
    notes: '回合制状态机底座。不改源码。ysbzs 通过 boardgame.io Game 接入。'
  },
  {
    id: 'pokemon_showdown',
    name: 'Pokémon Showdown',
    urls: [
      'https://github.com/smogon/pokemon-showdown',
      'https://github.com/smogon/pokemon-showdown/blob/master/PROTOCOL.md',
      'https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md'
    ],
    referenceType: 'protocol_reference',
    copiedPart: '结构化战斗协议和事件协议的设计思路',
    ysbzsModules: ['battleEventProtocol.cjs', 'explainTrace.cjs', 'changeLog.cjs'],
    integrationLevel: 'design_reference',
    notes: '结构化事件是事实，中文战报是展示。事件协议参考 Showdown 的 SIM-PROTOCOL。'
  },
  {
    id: 'forge',
    name: 'Forge / Card-Forge',
    urls: [
      'https://github.com/Card-Forge/forge',
      'https://github.com/Card-Forge/forge/tree/master/forge-core',
      'https://github.com/Card-Forge/forge/tree/master/forge-game'
    ],
    referenceType: 'rule_kernel_reference',
    copiedPart: 'replacement effect、continuous effect、triggered ability 的概念模型',
    ysbzsModules: ['replacementEffects.cjs', 'continuousEffects.cjs', 'triggerQueue.cjs', 'modifierEngine.cjs'],
    integrationLevel: 'design_reference',
    notes: '参考 MTG 风格规则引擎的分层设计，不复制 Java 源码。'
  },
  {
    id: 'xmage',
    name: 'XMage',
    urls: [
      'https://github.com/magefree/mage',
      'https://github.com/magefree/mage/tree/master/Mage.Tests',
      'https://github.com/magefree/mage/tree/master/Mage.Server'
    ],
    referenceType: 'scenario_test_reference',
    copiedPart: '固定局面、预设动作、断言结果的测试方法',
    ysbzsModules: ['scenarioRunner.cjs'],
    integrationLevel: 'design_reference',
    notes: '参考 XMage 的 Mage.Tests 固定局面测试思路，不接 Java 代码。'
  },
  {
    id: 'open_duelyst',
    name: 'OpenDuelyst',
    urls: [
      'https://github.com/open-duelyst/duelyst',
      'https://github.com/open-duelyst/duelyst/tree/main/app/sdk',
      'https://en.wikipedia.org/wiki/Duelyst'
    ],
    referenceType: 'tactical_targeting_reference',
    copiedPart: '棋盘单位、技能目标选择、卡牌/战棋混合交互的设计模式',
    ysbzsModules: ['tacticalTargeting.cjs'],
    integrationLevel: 'design_reference',
    notes: '参考 8×8 战棋的目标选择和预览方式，不切换成 Duelyst 架构。'
  },
  {
    id: 'tabletop_games',
    name: 'TabletopGames / TAG',
    urls: [
      'https://github.com/GAIGResearch/TabletopGames',
      'https://github.com/GAIGResearch/TabletopGames/tree/master/src/main/java/games',
      'https://arxiv.org/abs/2009.12065'
    ],
    referenceType: 'action_space_analysis_reference',
    copiedPart: 'action space、branching factor、AI agent 测试的分析方法',
    ysbzsModules: ['actionSpaceAnalyzer.cjs'],
    integrationLevel: 'design_reference',
    notes: '参考 TAG 框架的动作空间统计方式，不接 Java 框架。'
  },
  {
    id: 'vassal',
    name: 'Vassal Engine',
    urls: [
      'https://vassalengine.org/',
      'https://github.com/vassalengine/vassal',
      'https://vassalengine.org/wiki/Module_Section',
      'https://en.wikipedia.org/wiki/Vassal_%28game_engine%29'
    ],
    referenceType: 'module_manifest_reference',
    copiedPart: '模块清单、桌游组件声明、异步命令包的概念',
    ysbzsModules: ['moduleManifest.cjs'],
    integrationLevel: 'design_reference',
    notes: '参考 Vassal 的模块声明方式，不接 Java/Swing 代码。'
  }
]);

function getReferenceMap() { return REFERENCES; }

function getReferenceById(id) { return REFERENCES.find(r => r.id === id) || null; }

function countReferences() { return REFERENCES.length; }

module.exports = { getReferenceMap, getReferenceById, countReferences, REFERENCES };
