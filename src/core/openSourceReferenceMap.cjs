/** openSourceReferenceMap.cjs — 7 个开源来源与项目模块的映射说明
 *
 * 准确口径：
 *   boardgame.io 是直接上游底座（不改源码）；
 *   其余 6 个是架构思想/模块设计参考（不复制源码）。
 * 每条记录包含映射到的本地模块、来源 URL 和吸收了什么。 */
const REFERENCES = Object.freeze([
  { id:'boardgameio', name:'boardgame.io',
    urls: ['https://github.com/boardgameio/boardgame.io','https://boardgame.io/','https://boardgame.io/documentation/'],
    mode:'direct_upstream_base',
    local:['apps/ysbzs-boardgameio','YSBZSGame.moves'],
    copied:'Game / moves / turn / phase / client lifecycle',
    notes:'回合制状态机底座。不改源码。ysbzs 通过 boardgame.io Game 接入。' },
  { id:'showdown', name:'Pokémon Showdown',
    urls: ['https://github.com/smogon/pokemon-showdown','https://github.com/smogon/pokemon-showdown/blob/master/PROTOCOL.md','https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md'],
    mode:'architecture_reference',
    local:['battleEventProtocol.cjs','explainTrace.cjs','battleTrace'],
    copied:'structured battle protocol / readable log generation',
    notes:'结构化事件是事实，中文战报是展示。事件协议参考 Showdown 的 SIM-PROTOCOL。' },
  { id:'forge', name:'Forge / MTG rules',
    urls: ['https://github.com/Card-Forge/forge','https://github.com/Card-Forge/forge/tree/master/forge-core','https://github.com/Card-Forge/forge/tree/master/forge-game'],
    mode:'architecture_reference',
    local:['replacementEffects.cjs','continuousEffects.cjs','triggerQueue.cjs'],
    copied:'replacement / continuous / triggered effects',
    notes:'参考 MTG 风格规则引擎的分层设计，不复制 Java 源码。' },
  { id:'xmage', name:'XMage',
    urls: ['https://github.com/magefree/mage','https://github.com/magefree/mage/tree/master/Mage.Tests','https://github.com/magefree/mage/tree/master/Mage.Server'],
    mode:'test_reference',
    local:['scenarioRunner.cjs','scenario tests'],
    copied:'fixed board states and rule regression scenarios',
    notes:'参考 XMage 的 Mage.Tests 固定局面测试思路，不接 Java 代码。' },
  { id:'openduelyst', name:'OpenDuelyst',
    urls: ['https://github.com/open-duelyst/duelyst','https://github.com/open-duelyst/duelyst/tree/main/app/sdk','https://en.wikipedia.org/wiki/Duelyst'],
    mode:'ui_targeting_reference',
    local:['tacticalTargeting.cjs'],
    copied:'grid target selection / card+unit tactics flow',
    notes:'参考 8×8 战棋的目标选择和预览方式，不切换成 Duelyst 架构。' },
  { id:'tag', name:'TabletopGames / TAG',
    urls: ['https://github.com/GAIGResearch/TabletopGames','https://github.com/GAIGResearch/TabletopGames/tree/master/src/main/java/games','https://arxiv.org/abs/2009.12065'],
    mode:'ai_test_reference',
    local:['actionSpaceAnalyzer.cjs'],
    copied:'action-space and branching-factor reports',
    notes:'参考 TAG 框架的动作空间统计方式，不接 Java 框架。' },
  { id:'vassal', name:'Vassal Engine',
    urls: ['https://vassalengine.org/','https://github.com/vassalengine/vassal','https://vassalengine.org/wiki/Module_Section'],
    mode:'module_reference',
    local:['moduleManifest.cjs'],
    copied:'module manifest / async command envelope',
    notes:'参考 Vassal 的模块声明方式，不接 Java/Swing 代码。' }
]);
function listReferences() { return REFERENCES.map(x => Object.assign({}, x)); }
function getReference(id) { return REFERENCES.find(x => x.id === id || x.name === id) || null; }
module.exports = { REFERENCES, listReferences, getReference };
