const { solvePuzzle } = require('./puzzleSolver.cjs');

function generatePuzzleCandidates(options = {}) {
  const count = Math.max(1, Number(options.count || 1));
  const baseStateFactory = typeof options.baseState === 'function'
    ? options.baseState
    : () => options.baseState;
  if (!baseStateFactory) throw new Error('generatePuzzleCandidates requires baseState or baseState factory');

  const out = [];
  let attempts = 0;
  const maxAttempts = Math.max(count, Number(options.maxAttempts || count * 4));
  while (out.length < count && attempts < maxAttempts) {
    attempts += 1;
    const state = baseStateFactory({ attempt: attempts, index: out.length });
    const solve = solvePuzzle(state, {
      maxDepth: options.maxDepth ?? 3,
      maxSolutions: options.maxSolutions ?? 8,
      requireUnique: options.requireUnique !== false,
      includeMoves: options.includeMoves,
      includeSlots: options.includeSlots,
      goal: options.goal
    });
    if (solve.status !== 'solved') continue;
    out.push({
      puzzleId: `generated_exact_${String(out.length + 1).padStart(3, '0')}`,
      solve,
      summary: {
        shortestDepth: solve.shortestDepth,
        solutionCount: solve.solutionCount,
        explored: solve.explored,
        initialHash: solve.initialHash
      }
    });
  }
  return out;
}

module.exports = { generatePuzzleCandidates };
