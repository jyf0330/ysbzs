(function () {
  const fallback = {
    puzzleId: 'generated_exact_001',
    summary: {
      shortestDepth: 1,
      solutionCount: 1,
      explored: 3,
      initialHash: 'b422f6d357d2a67e'
    },
    solve: {
      status: 'solved',
      shortestDepth: 1,
      solutionCount: 1,
      initialHash: 'b422f6d357d2a67e',
      solution: [{
        type: 'USE_ACTION_SLOT',
        unitId: 'hero_fire',
        slotId: 0,
        dir: 'right',
        ap: 3,
        cells: [{ r: 3, c: 4 }],
        stateHash: '5bf005a74725dc3b'
      }]
    }
  };

  const board = document.getElementById('solver-board');
  const output = document.getElementById('proof-output');
  const statusEl = document.getElementById('solve-status');
  const depthEl = document.getElementById('shortest-depth');
  const countEl = document.getElementById('solution-count');
  const initialHashEl = document.getElementById('initial-hash');
  const finalHashEl = document.getElementById('final-hash');
  const stepsEl = document.getElementById('solution-steps');
  const captionEl = document.getElementById('board-caption');
  const sourceEl = document.getElementById('source-label');
  const consoleEl = document.getElementById('console-status');
  let current = fallback;
  let activeStep = -1;

  function cellKey(r, c) {
    return `${r},${c}`;
  }

  function renderBoard() {
    const hitCells = new Set(activeStep >= 0
      ? (current.solve.solution[activeStep]?.cells || []).map(p => cellKey(p.r, p.c))
      : []);
    board.innerHTML = '';
    for (let r = 0; r < 8; r += 1) {
      for (let c = 0; c < 8; c += 1) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.label = `${r + 1}-${c + 1}`;
        if (hitCells.has(cellKey(r, c))) cell.classList.add('hit');
        if (r === 3 && c === 3) {
          const unit = document.createElement('div');
          unit.className = 'unit ally';
          unit.textContent = '火';
          unit.title = 'hero_fire';
          cell.appendChild(unit);
        }
        if (r === 3 && c === 4) {
          const unit = document.createElement('div');
          unit.className = 'unit enemy';
          unit.textContent = '6';
          unit.title = 'enemy_target HP6';
          cell.appendChild(unit);
        }
        board.appendChild(cell);
      }
    }
    captionEl.textContent = activeStep >= 0 ? '已高亮当前解法命中格。' : '当前展示初始局面。';
  }

  function renderSteps() {
    stepsEl.innerHTML = '';
    const steps = current.solve.solution || [];
    steps.forEach((step, index) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = index === activeStep ? 'active' : '';
      btn.textContent = `${index + 1}. ${step.unitId} ${step.dir} 第${Number(step.slotId) + 1}槽 AP${step.ap} -> ${step.stateHash}`;
      btn.addEventListener('click', () => {
        activeStep = index;
        renderBoard();
        renderSteps();
      });
      li.appendChild(btn);
      stepsEl.appendChild(li);
    });
  }

  function renderProof() {
    const solve = current.solve || current;
    const final = solve.solution && solve.solution.length ? solve.solution[solve.solution.length - 1].stateHash : '-';
    statusEl.textContent = solve.status || '-';
    depthEl.textContent = String(solve.shortestDepth ?? '-');
    countEl.textContent = String(solve.solutionCount ?? '-');
    initialHashEl.textContent = solve.initialHash || current.summary?.initialHash || '-';
    finalHashEl.textContent = final;
    output.textContent = JSON.stringify({
      puzzleId: current.puzzleId,
      status: solve.status,
      shortestDepth: solve.shortestDepth,
      solutionCount: solve.solutionCount,
      solution: solve.solution,
      summary: current.summary
    }, null, 2);
    renderSteps();
    renderBoard();
  }

  async function loadDemo() {
    sourceEl.textContent = 'loading';
    try {
      const res = await fetch('/api/puzzle/solve-demo?count=1', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const item = data.candidates && data.candidates[0];
      if (!item) throw new Error('EMPTY_CANDIDATE');
      current = item;
      sourceEl.textContent = 'server';
      consoleEl.textContent = 'console: ok';
    } catch (err) {
      current = fallback;
      sourceEl.textContent = 'fixture';
      consoleEl.textContent = 'console: fallback';
    }
    activeStep = -1;
    renderProof();
  }

  document.getElementById('refresh-demo-btn').addEventListener('click', loadDemo);
  document.getElementById('solve-btn').addEventListener('click', () => {
    activeStep = 0;
    renderProof();
  });

  renderProof();
  loadDemo();
}());
