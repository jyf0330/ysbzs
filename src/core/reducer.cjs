const battle = require('./battle.cjs');
const shop = require('./shop.cjs');
const day7 = require('./day7FireTrial.cjs');
const dayRoute = require('./dayRoute.cjs');
const { buildReplay } = require('./changeLog.cjs');

function dispatch(state, command) {
  switch (command.type) {
    case 'START_BATTLE': return battle.startBattle(state);
    case 'START_NEXT_ROUND': return battle.startNextRound(state);
    case 'MOVE_HERO': return battle.moveHero(state, command.unitId || command.heroId, command.to || command.cell || { r: command.r, c: command.c });
    case 'SELECT_HERO':
    case 'SELECT_UNIT':
    case 'SELECT_CELL':
    case 'SELECT_SLOT': return true;
    case 'SET_ACTION_DIRECTION': return battle.setActionDirection(state, command.unitId || command.heroId, command.slotId ?? command.index, command.dir || command.direction || 'right');
    case 'USE_SLOT':
    case 'USE_ACTION_SLOT': return battle.useActionSlot(state, command.unitId || command.heroId, command.slotId ?? command.index, command.targetCell || command.cell || (typeof command.r !== 'undefined' ? { r: command.r, c: command.c } : null), command);
    case 'END_PLAYER_TURN': return battle.endPlayerTurn(state);
    case 'RUN_MONSTER_TURN': return battle.runMonsterTurn(state);
    case 'BUILD_PREVIEW': return battle.buildPreviewGrid(state, command);
    case 'GET_CELL_DETAIL': return battle.getCellDetail(state, command.r ?? command.row, command.c ?? command.col);
    case 'RUN_BATTLE': return battle.runBattle(state);
    case 'GENERATE_NODE_OPTIONS': return dayRoute.generateNodeOptions(state, command);
    case 'PICK_NODE': return dayRoute.pickNode(state, command.optionId ?? command.nodeId ?? command.index);
    case 'GENERATE_BATTLE_OPTIONS': return dayRoute.generateBattleOptions(state, command);
    case 'PICK_BATTLE_ENCOUNTER': return dayRoute.pickBattleEncounter(state, command.encounterId ?? command.optionId ?? command.index);
    case 'RUN_ROUTE_FIXED_BATTLE': return dayRoute.runFixedBattle(state, command);
    case 'CLAIM_ROUTE_REWARD': return dayRoute.claimRouteReward(state, command.rewardId ?? command.encounterId ?? command.index, command);
    case 'ENTER_SHOP': return shop.enterShop(state, command.poolId, command.slots);
    case 'ROLL_SHOP': return shop.rollShop(state, command);
    case 'FREEZE_OFFER': return shop.freezeOffer(state, command.offerId, true);
    case 'UNFREEZE_OFFER': return shop.freezeOffer(state, command.offerId, false);
    case 'BUY_OFFER': return shop.buyOffer(state, command.offerId);
    case 'APPLY_SHOP_EVENT': return shop.applyShopEvent(state, command.eventId);
    case 'REWARD_OPTIONS': return shop.rewardOptions(state, command.poolId, command.count);
    case 'PICK_REWARD': return shop.pickReward(state, command.index || 0);
    case 'EXIT_SHOP': return shop.exitShop(state);
    case 'EXPORT_BATTLE_TRACE': return { events: state.battleTrace && state.battleTrace.length ? state.battleTrace : state.events.slice() };
    case 'REPLAY_BATTLE_TRACE': return { replayed: true, events: command.events || state.battleTrace || [] };
    case 'EXPORT_REPLAY': return buildReplay(state, command || {});
    case 'SETUP_DAY7_FIRE_TRIAL': return day7.setupDay7FireTrial(state, command);
    case 'RUN_DAY7_FIRE_TURN_1': return day7.runDay7FireTurn1(state, command);
    case 'RUN_DAY7_FIRE_TRIAL_ALL': return day7.runDay7FireTrialAll(state, command);
    default: throw new Error(`Unknown command: ${command.type}`);
  }
}
module.exports = { dispatch };
