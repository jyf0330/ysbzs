const battle = require('./battle.cjs');
const { stateHash } = require('./stateHash.cjs');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function livingEnemies(state) {
  return (state.units || []).filter(u => u.side === 'enemy' && u.alive !== false && Number(u.hp || 0) > 0);
}

function defaultGoal(state) {
  return livingEnemies(state).length === 0;
}

function boardUnitAt(state, pos) {
  return (state.units || []).find(u => u.alive !== false && u.position && u.position.r === pos.r && u.position.c === pos.c) || null;
}

function inBoard(state, pos) {
  const rows = Number(state.board?.rows || 8);
  const cols = Number(state.board?.cols || 8);
  return pos.r >= 0 && pos.c >= 0 && pos.r < rows && pos.c < cols;
}

function dist(a, b) {
  return Math.abs(Number(a.r) - Number(b.r)) + Math.abs(Number(a.c) - Number(b.c));
}

function liveHeroes(state) {
  return (state.units || []).filter(u => u.side === 'hero' && u.alive !== false && Number(u.hp || 0) > 0);
}

function enumerateMoveActions(state, unit) {
  if (unit.hasAttacked) return [];
  const from = unit.position || { r: 0, c: 0 };
  const range = battle.effectiveMoveRange(state, unit);
  const out = [];
  for (let r = 0; r < Number(state.board?.rows || 8); r += 1) {
    for (let c = 0; c < Number(state.board?.cols || 8); c += 1) {
      const to = { r, c };
      if (to.r === from.r && to.c === from.c) continue;
      if (dist(from, to) > range) continue;
      const occupant = boardUnitAt(state, to);
      if (occupant && occupant.id !== unit.id) continue;
      out.push({ type: 'MOVE_HERO', unitId: unit.id, to });
    }
  }
  return out;
}

function enumerateSlotActions(state, unit) {
  const out = [];
  const dirs = ['right', 'left', 'up', 'down'];
  const slots = battle.slotsForUnit(state, unit).filter(slot => slot.canUse);
  for (const slot of slots) {
    for (const dir of dirs) {
      const directed = Object.assign({}, slot, { direction: dir });
      const cells = battle.targetCellsForSlot
        ? battle.targetCellsForSlot(state, unit, directed)
        : [];
      if (!cells.length) continue;
      const availableAp = Math.max(1, Number(slot.availableAp || unit.ap || 1));
      for (let ap = 1; ap <= availableAp; ap += 1) {
        out.push({
          type: 'USE_ACTION_SLOT',
          unitId: unit.id,
          slotId: slot.index,
          dir,
          ap,
          cells
        });
      }
    }
  }
  return out;
}

function enumerateActions(state, options = {}) {
  const includeMoves = options.includeMoves !== false;
  const includeSlots = options.includeSlots !== false;
  const out = [];
  for (const unit of liveHeroes(state)) {
    if (includeSlots) out.push(...enumerateSlotActions(state, unit));
    if (includeMoves) out.push(...enumerateMoveActions(state, unit));
  }
  return out;
}

function applyAction(state, action) {
  const next = clone(state);
  battle.syncDerivedBoard(next);
  let ok = false;
  if (action.type === 'MOVE_HERO') {
    ok = battle.moveHero(next, action.unitId, action.to);
  } else if (action.type === 'USE_ACTION_SLOT') {
    battle.setActionDirection(next, action.unitId, action.slotId, action.dir);
    ok = battle.useActionSlot(next, action.unitId, action.slotId, null, { ap: action.ap });
  }
  if (!ok) return null;
  battle.syncDerivedBoard(next);
  return next;
}

function publicAction(action, state) {
  return Object.assign({}, action, {
    cells: action.cells ? action.cells.map(p => ({ r: p.r, c: p.c })) : undefined,
    stateHash: stateHash(state)
  });
}

function solvePuzzle(initialState, options = {}) {
  const maxDepth = Math.max(0, Number(options.maxDepth ?? 3));
  const maxSolutions = Math.max(1, Number(options.maxSolutions ?? 8));
  const goal = typeof options.goal === 'function' ? options.goal : defaultGoal;
  const root = clone(initialState);
  battle.syncDerivedBoard(root);

  if (goal(root)) {
    return {
      status: 'solved',
      shortestDepth: 0,
      solutionCount: 1,
      solution: [],
      solutions: [[]],
      finalState: root,
      explored: 1,
      initialHash: stateHash(root)
    };
  }

  const queue = [{ state: root, path: [], depth: 0 }];
  const visited = new Set([stateHash(root)]);
  const solutions = [];
  let finalState = null;
  let shortestDepth = null;
  let explored = 0;

  while (queue.length) {
    const node = queue.shift();
    explored += 1;
    if (shortestDepth !== null && node.depth >= shortestDepth) continue;
    if (node.depth >= maxDepth) continue;

    for (const action of enumerateActions(node.state, options)) {
      const next = applyAction(node.state, action);
      if (!next) continue;
      const hash = stateHash(next);
      const path = node.path.concat(publicAction(action, next));
      if (goal(next)) {
        const depth = node.depth + 1;
        if (shortestDepth === null) shortestDepth = depth;
        if (depth === shortestDepth) {
          solutions.push(path);
          if (!finalState) finalState = next;
          if (solutions.length >= maxSolutions) break;
        }
        continue;
      }
      if (shortestDepth !== null) continue;
      if (visited.has(hash)) continue;
      visited.add(hash);
      queue.push({ state: next, path, depth: node.depth + 1 });
    }
    if (solutions.length >= maxSolutions) break;
  }

  if (!solutions.length) {
    return {
      status: 'unsolved',
      shortestDepth: null,
      solutionCount: 0,
      solution: [],
      solutions: [],
      finalState: null,
      explored,
      initialHash: stateHash(root)
    };
  }

  const status = options.requireUnique && solutions.length !== 1 ? 'non_unique' : 'solved';
  return {
    status,
    shortestDepth,
    solutionCount: solutions.length,
    solution: solutions[0],
    solutions,
    finalState,
    explored,
    initialHash: stateHash(root)
  };
}

module.exports = {
  solvePuzzle,
  enumerateActions,
  applyAction,
  defaultGoal
};
