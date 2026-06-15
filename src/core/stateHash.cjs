const crypto = require('crypto');

function stable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stable);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
  return out;
}

function pickUnit(unit) {
  if (!unit) return null;
  return {
    id: unit.id,
    side: unit.side,
    camp: unit.camp,
    teamId: unit.teamId,
    controllerId: unit.controllerId,
    petId: unit.petId,
    name: unit.name,
    hp: unit.hp,
    maxHp: unit.maxHp,
    atk: unit.atk,
    def: unit.def,
    shield: unit.shield,
    ap: unit.ap,
    alive: unit.alive !== false,
    active: unit.active !== false,
    position: unit.position ? { r: Number(unit.position.r), c: Number(unit.position.c) } : null,
    elements: unit.elements || {},
    actionSlotsUsed: unit.actionSlotsUsed || {},
    actionApSpent: unit.actionApSpent || 0,
    hasAttacked: !!unit.hasAttacked
  };
}

function serializableState(state) {
  return {
    battleId: state.battleId,
    mode: state.mode,
    stateVersion: state.stateVersion || 0,
    rngState: state.rngState || null,
    day: state.day,
    period: state.period,
    phase: state.phase,
    round: state.round,
    maxRounds: state.maxRounds,
    gold: state.gold,
    castleLine: state.castleLine,
    economyMultiplier: state.economyMultiplier,
    players: state.players || {},
    teams: state.teams || {},
    turn: state.turn || {},
    result: state.result || null,
    leaders: {
      player: pickUnit(state.leaders && state.leaders.player),
      enemy: pickUnit(state.leaders && state.leaders.enemy)
    },
    units: (state.units || []).map(pickUnit).sort((a, b) => String(a.id).localeCompare(String(b.id))),
    board: state.board ? {
      rows: state.board.rows,
      cols: state.board.cols,
      cells: (state.board.cells || []).map(c => ({
        r: c.r,
        c: c.c,
        unitId: c.unitId || null,
        leaderId: c.leaderId || null,
        elements: c.elements || {},
        elementCamps: c.elementCamps || {},
        terrain: c.terrain || null
      }))
    } : null,
    inventory: (state.inventory || []).map(x => ({
      petId: x.petId,
      instanceId: x.instanceId,
      count: x.count,
      level: x.level,
      active: x.active !== false,
      slot: x.slot
    })),
    battlePrepEffects: (state.battlePrepEffects || []).map(x => ({
      effectId: x.effectId,
      eventId: x.eventId,
      source: x.source,
      nodeId: x.nodeId || null,
      type: x.type,
      shield: x.shield,
      bonusDamage: x.bonusDamage,
      status: x.status,
      dayQueued: x.dayQueued,
      usesRemaining: x.usesRemaining
    })),
    shop: {
      activePool: state.shop && state.shop.activePool,
      activeStall: state.shop && state.shop.activeStall ? {
        nodeId: state.shop.activeStall.nodeId || null,
        name: state.shop.activeStall.name,
        shopPoolId: state.shop.activeStall.shopPoolId,
        tags: state.shop.activeStall.tags || [],
        slots: state.shop.activeStall.slots,
        unlockDay: state.shop.activeStall.unlockDay,
        priceRule: state.shop.activeStall.priceRule
      } : null,
      rollCount: state.shop && state.shop.rollCount,
      freeRolls: state.shop && state.shop.freeRolls,
      nextDiscount: state.shop && state.shop.nextDiscount,
      refreshState: state.shop && state.shop.refreshState ? {
        freeRolls: state.shop.refreshState.freeRolls,
        nextDiscount: state.shop.refreshState.nextDiscount,
        targetedRestocks: (state.shop.refreshState.targetedRestocks || []).map(x => ({
          restockId: x.restockId,
          eventId: x.eventId,
          poolId: x.poolId,
          tags: x.tags || [],
          slots: x.slots,
          status: x.status,
          offerIds: x.offerIds || []
        })),
        effects: (state.shop.refreshState.effects || []).map(x => ({
          eventId: x.eventId,
          source: x.source,
          freeRolls: x.freeRolls,
          nextDiscount: x.nextDiscount,
          targetedPoolId: x.targetedPoolId
        })),
        lastRoll: state.shop.refreshState.lastRoll || null
      } : null,
      offers: ((state.shop && state.shop.offers) || []).map(o => ({
        offerId: o.offerId,
        petId: o.petId,
        price: o.price,
        frozen: !!o.frozen,
        poolId: o.poolId
      }))
    },
    rewards: state.rewards || []
  };
}

function stateHash(state) {
  const json = JSON.stringify(stable(serializableState(state)));
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 16);
}

module.exports = { stable, serializableState, stateHash };
