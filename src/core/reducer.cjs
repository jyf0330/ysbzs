const battle = require('./battle.cjs');
const shop = require('./shop.cjs');

function dispatch(state, command) {
  switch (command.type) {
    case 'START_BATTLE': return battle.startBattle(state);
    case 'START_NEXT_ROUND': return battle.startNextRound(state);
    case 'MOVE_HERO': return battle.moveHero(state, command.unitId || command.heroId, command.to || command.cell || { r: command.r, c: command.c });
    case 'SELECT_HERO':
    case 'SELECT_UNIT': state.selected.unitId = command.unitId || command.heroId || command.id || null; return true;
    case 'SELECT_CELL': state.selected.cell = { r: Number(command.r ?? command.row ?? command.cell?.r ?? 0), c: Number(command.c ?? command.col ?? command.cell?.c ?? 0) }; return true;
    case 'SELECT_SLOT': state.selected.slotId = Number(command.slotId ?? command.index ?? 0); return true;
    case 'SET_ACTION_DIRECTION': return battle.setActionDirection(state, command.unitId || command.heroId, command.slotId ?? command.index, command.dir || command.direction || 'right');
    case 'USE_SLOT':
    case 'USE_ACTION_SLOT': return battle.useActionSlot(state, command.unitId || command.heroId, command.slotId ?? command.index, command.targetCell || command.cell || (typeof command.r !== 'undefined' ? { r: command.r, c: command.c } : null));
    case 'END_PLAYER_TURN': return battle.endPlayerTurn(state);
    case 'RUN_MONSTER_TURN': return battle.runMonsterTurn(state);
    case 'BUILD_PREVIEW': return battle.buildPreviewGrid(state, command);
    case 'GET_CELL_DETAIL': return battle.getCellDetail(state, command.r ?? command.row, command.c ?? command.col);
    case 'RUN_BATTLE': return battle.runBattle(state);
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
    default: throw new Error(`Unknown command: ${command.type}`);
  }
}
module.exports = { dispatch };
