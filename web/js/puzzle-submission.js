const PET_POOL = [
  { id: 'pal_001', name: '棉悠悠', element: '风', role: '经济', atk: 1, hp: 6 },
  { id: 'pal_002', name: '捣蛋猫', element: '风', role: '坦克', atk: 3, hp: 20 },
  { id: 'pal_003', name: '皮皮鸡', element: '风', role: '经济', atk: 3, hp: 10 },
  { id: 'pal_004', name: '翠叶鼠', element: '风', role: '治疗', atk: 3, hp: 10 },
  { id: 'pal_005', name: '火绒狐', element: '火', role: '输出', atk: 2, hp: 10 },
  { id: 'pal_006', name: '冲浪鸭', element: '水', role: '治疗', atk: 2, hp: 10 },
  { id: 'pal_009', name: '燎火鹿', element: '火', role: '输出', atk: 3, hp: 25 },
  { id: 'pal_042', name: '炽焰牛', element: '火', role: '输出', atk: 2, hp: 10 }
];

const DIFFICULTY_TEXT = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  brain: '烧脑'
};

const TYPE_TEXT = {
  fire_burst: '火爆发',
  water_catalyst: '水催化',
  wind_shift: '风位移',
  rescue: '救援',
  endgame: '残局',
  custom: '自定义'
};

const KIND_TEXT = {
  ally_pet: '我方',
  enemy: '敌人',
  boss: 'Boss',
  fire_element: '火',
  water_element: '水',
  wind_element: '风',
  fire_trap: '陷阱',
  empty: '空'
};

const WIN_TEMPLATE = {
  kill_boss_within_turns: { type: 'kill_target', text: '回合内击杀 Boss' },
  kill_all_within_turns: { type: 'kill_all', text: '回合内全灭敌人' },
  protect_pet: { type: 'protect_target', text: '保护指定宠物不死亡' },
  require_pet: { type: 'require_pet', text: '必须使用指定宠物通关' },
  block_enemy_area: { type: 'block_area', text: '不能让敌人进入指定区域' },
  fire_burst_kill: { type: 'elemental_kill', text: '用火元素引爆击杀敌人', element: 'fire' },
  water_fire_chain_kill: { type: 'elemental_chain_kill', text: '用水火连锁击杀敌人', chain: ['water', 'fire'] },
  wind_shift_kill: { type: 'wind_shift_kill', text: '用风移动元素后击杀敌人' }
};

const state = {
  selectedKind: 'ally_pet',
  selectedCell: { row: 5, col: 6 },
  exportMode: 'post',
  placements: new Map(),
  copied: false
};

const $ = (id) => document.getElementById(id);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[ch]));
}

function key(row, col) {
  return `${row},${col}`;
}

function numberValue(id, fallback = 0) {
  const value = Number($(id).value);
  return Number.isFinite(value) ? value : fallback;
}

function textValue(id) {
  return String($(id).value || '').trim();
}

function selectedPets() {
  const ids = qsa('[data-pet-id]:checked').map((input) => input.dataset.petId);
  return PET_POOL.filter((pet) => ids.includes(pet.id));
}

function firstBoss() {
  return Array.from(state.placements.values()).find((item) => item.kind === 'boss') || null;
}

function enemyPlacements() {
  return Array.from(state.placements.values()).filter((item) => item.kind === 'enemy' || item.kind === 'boss');
}

function getPuzzleId() {
  const type = $('puzzle-type').value.replace(/_.+$/, '') || 'custom';
  return `puzzle_${type}_001`;
}

function renderPetList() {
  const list = $('pet-list');
  list.innerHTML = PET_POOL.map((pet, index) => `
    <label class="pet-option">
      <input type="checkbox" data-pet-id="${esc(pet.id)}" ${index < 5 ? 'checked' : ''} />
      <span>
        <strong>${esc(pet.name)}</strong>
        <span>${esc(pet.element)} · ${esc(pet.role)} · HP ${pet.hp} / 攻 ${pet.atk}</span>
      </span>
      <span>${esc(pet.id)}</span>
    </label>
  `).join('');
}

function renderAxes() {
  $('axis-cols').innerHTML = Array.from({ length: 8 }, (_, index) => `<span>第${index + 1}列</span>`).join('');
  $('axis-rows').innerHTML = Array.from({ length: 8 }, (_, index) => `<span>第${index + 1}行</span>`).join('');
}

function cellLabel(item) {
  if (!item) return { kind: '空', name: '', meta: '' };
  const stacks = [];
  if (item.elementStacks?.fire) stacks.push(`火${item.elementStacks.fire}`);
  if (item.elementStacks?.water) stacks.push(`水${item.elementStacks.water}`);
  return {
    kind: KIND_TEXT[item.kind] || item.kind,
    name: item.displayName || KIND_TEXT[item.kind] || '内容',
    meta: [item.hp ? `${item.hp}血` : '', item.atk ? `攻${item.atk}` : '', stacks.join(' ')].filter(Boolean).join(' · ')
  };
}

function renderBoard() {
  const board = $('puzzle-board');
  const html = [];
  for (let row = 1; row <= 8; row += 1) {
    for (let col = 1; col <= 8; col += 1) {
      const item = state.placements.get(key(row, col));
      const label = cellLabel(item);
      const selected = state.selectedCell.row === row && state.selectedCell.col === col;
      html.push(`
        <button class="cell kind-${esc(item?.kind || 'empty')} ${selected ? 'selected' : ''}" type="button" data-row="${row}" data-col="${col}" aria-label="第${row}行第${col}列">
          <span class="cell-kind">R${row} C${col} · ${esc(label.kind)}</span>
          <span class="cell-name">${esc(label.name || '空')}</span>
          <span class="cell-meta"><span>${esc(label.meta)}</span></span>
        </button>
      `);
    }
  }
  board.innerHTML = html.join('');
}

function renderEnemies() {
  const enemies = enemyPlacements();
  $('enemy-list').innerHTML = enemies.length ? enemies.map((enemy) => `
    <div class="enemy-row">
      <div>
        <strong>${esc(enemy.displayName || '未命名敌人')}</strong>
        <span>第${enemy.row}行第${enemy.col}列 · ${enemy.hp || 0} 血 · 攻 ${enemy.atk || 0}${enemy.kind === 'boss' ? ' · Boss' : ''}</span>
      </div>
      <button type="button" data-focus-cell="${enemy.row},${enemy.col}">定位</button>
    </div>
  `).join('') : '<p class="inline-note">还没有敌人。击杀类谜题需要至少一个敌人或 Boss。</p>';
}

function renderStatus() {
  const pets = selectedPets();
  $('pet-count-label').textContent = `${pets.length} 只 / 最多 ${numberValue('max-deploy', 4)} 只上阵`;
  $('selected-cell-label').textContent = `当前选中：第${state.selectedCell.row}行第${state.selectedCell.col}列 · ${KIND_TEXT[state.selectedKind]}`;
}

function placementFromInputs(row, col) {
  if (state.selectedKind === 'empty') return null;
  const name = textValue('placement-name') || KIND_TEXT[state.selectedKind];
  const hp = numberValue('placement-hp', 0);
  const atk = numberValue('placement-atk', 0);
  const fire = numberValue('stack-fire', 0);
  const water = numberValue('stack-water', 0);
  const refPet = PET_POOL.find((pet) => pet.name === name);
  return {
    row,
    col,
    kind: state.selectedKind,
    refId: refPet?.id || (state.selectedKind === 'boss' ? 'enemy_boss_001' : ''),
    displayName: name,
    hp,
    atk,
    elementStacks: {
      fire,
      water
    }
  };
}

function placeSelectedCell() {
  const { row, col } = state.selectedCell;
  const next = placementFromInputs(row, col);
  if (!next) state.placements.delete(key(row, col));
  else state.placements.set(key(row, col), next);
  update();
}

function buildPuzzle() {
  const pets = selectedPets();
  const enemies = enemyPlacements().map((enemy, index) => ({
    id: enemy.kind === 'boss' ? 'enemy_boss_001' : `enemy_${String(index + 1).padStart(3, '0')}`,
    name: enemy.displayName || (enemy.kind === 'boss' ? '铁壳考官' : '敌人'),
    hp: Number(enemy.hp || 0),
    atk: Number(enemy.atk || 0),
    position: { row: enemy.row, col: enemy.col },
    isBoss: enemy.kind === 'boss'
  }));
  const boss = enemies.find((enemy) => enemy.isBoss) || enemies[0] || null;
  const templateId = $('win-template').value;
  const template = WIN_TEMPLATE[templateId] || WIN_TEMPLATE.kill_boss_within_turns;
  const winCondition = {
    templateId,
    type: template.type,
    withinTurns: numberValue('turn-limit', 1)
  };
  if (boss) winCondition.targetId = boss.id;
  if (template.element) winCondition.element = template.element;
  if (template.chain) winCondition.chain = template.chain;
  if (textValue('win-note')) winCondition.note = textValue('win-note');
  return {
    puzzleId: getPuzzleId(),
    name: textValue('puzzle-name') || '未命名谜题',
    difficulty: $('difficulty').value,
    type: $('puzzle-type').value,
    boardSize: [8, 8],
    turnLimit: numberValue('turn-limit', 1),
    description: textValue('description'),
    availablePets: pets.map((pet) => pet.id),
    maxDeployPets: numberValue('max-deploy', 4),
    placements: Array.from(state.placements.values()),
    enemies,
    winCondition,
    solutionOptional: !textValue('solution-text'),
    solution: textValue('solution-text') ? {
      isProvided: true,
      rawText: textValue('solution-text')
    } : {
      isProvided: false
    },
    meta: {
      petDisplayNames: pets.map((pet) => pet.name),
      rawIntentText: textValue('raw-intent')
    }
  };
}

function validatePuzzle(puzzle) {
  const issues = [];
  const warnings = [];
  const occupied = new Set();
  for (const item of puzzle.placements) {
    if (item.row < 1 || item.row > 8 || item.col < 1 || item.col > 8) issues.push('不能把单位放到棋盘外。');
    const pos = key(item.row, item.col);
    if (occupied.has(pos)) issues.push(`第${item.row}行第${item.col}列重复占用。`);
    occupied.add(pos);
    if (item.kind === 'boss' && !(Number(item.hp) > 0)) issues.push('Boss 必须有生命值。');
  }
  if (!puzzle.winCondition?.type) issues.push('胜利条件必须存在。');
  if (!puzzle.availablePets.length) issues.push('可用宠物不能为空。');
  if (!(puzzle.turnLimit > 0)) issues.push('限制回合数必须大于 0。');
  if (['kill_target', 'kill_all', 'elemental_kill', 'elemental_chain_kill', 'wind_shift_kill'].includes(puzzle.winCondition.type) && !puzzle.enemies.length) {
    issues.push('如果谜题要求击杀敌人，必须有敌人。');
  }
  if (puzzle.winCondition.type === 'protect_target' && !puzzle.winCondition.targetId) {
    issues.push('如果谜题要求保护宠物，必须指定保护对象。');
  }
  if (puzzle.availablePets.length < puzzle.maxDeployPets) warnings.push('最多上阵数大于可用宠物数，建议调小。');
  if (!puzzle.solution?.isProvided) warnings.push('你可以不写标准答案，但建议至少写一句核心思路。');
  warnings.push('是否能在限制回合内完成需要接入战斗模拟器验证。');
  warnings.push('是否存在多解需要后续搜索行动序列。');
  return { issues: Array.from(new Set(issues)), warnings };
}

function readablePost(puzzle) {
  const boss = puzzle.enemies.find((enemy) => enemy.isBoss) || puzzle.enemies[0];
  const petNames = puzzle.meta.petDisplayNames.join('、') || '未选择';
  const target = boss ? `${boss.name}，${boss.hp} 血，位于第${boss.position.row}行第${boss.position.col}列。` : '未添加敌人。';
  return `谜题名：${puzzle.name}

难度：${DIFFICULTY_TEXT[puzzle.difficulty]}
类型：${TYPE_TEXT[puzzle.type]}题
限制：${puzzle.turnLimit} 回合

可用宠物：
${petNames}

规则：
${puzzle.availablePets.length} 只宠物里最多选择 ${puzzle.maxDeployPets} 只行动。
${puzzle.description || `目标是在 ${puzzle.turnLimit} 回合内完成胜利条件。`}

敌人：
${target}

胜利条件：
${puzzle.winCondition.note || `${puzzle.turnLimit} 回合内完成：${WIN_TEMPLATE[puzzle.winCondition.templateId]?.text || puzzle.winCondition.type}`}

问题：
你会选择哪 ${puzzle.maxDeployPets} 只宠物？`;
}

function checkReport(puzzle, validation) {
  const pass = (ok) => ok ? '通过' : '未通过';
  return `检查结果：

1. 是否有明确胜利条件：${pass(Boolean(puzzle.winCondition?.type))}
2. 是否有可用宠物：${pass(puzzle.availablePets.length > 0)}
3. 是否有敌人：${pass(puzzle.enemies.length > 0)}
4. 是否能在限制回合内完成：需要验证
5. 是否可能存在多解：可能存在
6. 是否适合玩家投稿：${validation.issues.length ? '需要修改' : '通过'}

硬校验：
${validation.issues.length ? validation.issues.map((item) => `- ${item}`).join('\n') : '- 全部通过'}

建议：
${validation.warnings.map((item) => `- ${item}`).join('\n')}`;
}

function renderExport() {
  const puzzle = buildPuzzle();
  const validation = validatePuzzle(puzzle);
  $('condition-status').textContent = validation.issues.length ? '需修改' : '可投稿';
  $('draft-status').textContent = validation.issues.length ? '草稿需检查' : '可导出';
  let output = '';
  if (state.exportMode === 'post') output = readablePost(puzzle);
  if (state.exportMode === 'json') output = JSON.stringify(puzzle, null, 2);
  if (state.exportMode === 'report') output = checkReport(puzzle, validation);
  $('export-output').textContent = output;
}

function update() {
  renderStatus();
  renderBoard();
  renderEnemies();
  renderExport();
}

function applyNaturalLanguageDraft() {
  const raw = textValue('raw-intent');
  const turn = raw.match(/(\d+)\s*回合/);
  const hp = raw.match(/(?:Boss|boss|BOSS)[^\d]*(\d+)\s*血/);
  const pos = raw.match(/第\s*(\d+)\s*行\s*第\s*(\d+)\s*列/);
  const maxDeploy = raw.match(/最多(?:选|选择|上阵)?\s*(\d+)\s*只/);
  if (turn) $('turn-limit').value = turn[1];
  if (maxDeploy) $('max-deploy').value = Math.min(4, Math.max(1, Number(maxDeploy[1])));
  if (/火爆发/.test(raw)) $('puzzle-type').value = 'fire_burst';
  if (/水/.test(raw) && /催化/.test(raw)) $('puzzle-type').value = 'water_catalyst';
  if (/风/.test(raw) && /位移/.test(raw)) $('puzzle-type').value = 'wind_shift';
  PET_POOL.forEach((pet) => {
    const checkbox = document.querySelector(`[data-pet-id="${pet.id}"]`);
    if (checkbox) checkbox.checked = raw.includes(pet.name);
  });
  if (pos) {
    const row = Number(pos[1]);
    const col = Number(pos[2]);
    state.selectedCell = { row, col };
    state.placements.set(key(row, col), {
      row,
      col,
      kind: 'boss',
      refId: 'enemy_boss_001',
      displayName: raw.includes('铁壳考官') ? '铁壳考官' : '铁壳考官',
      hp: hp ? Number(hp[1]) : 90,
      atk: 0,
      elementStacks: { fire: 0, water: 0 }
    });
    $('placement-name').value = '铁壳考官';
    $('placement-hp').value = hp ? hp[1] : '90';
    $('placement-atk').value = '0';
  }
  $('normalization-note').textContent = '已整理：回合、题型、可用宠物、Boss 坐标和生命值。';
  update();
}

function seedDefaultPuzzle() {
  state.placements.set(key(5, 6), {
    row: 5,
    col: 6,
    kind: 'boss',
    refId: 'enemy_boss_001',
    displayName: '铁壳考官',
    hp: 90,
    atk: 0,
    elementStacks: { fire: 0, water: 0 }
  });
  state.placements.set(key(7, 2), {
    row: 7,
    col: 2,
    kind: 'ally_pet',
    refId: 'pal_001',
    displayName: '棉悠悠',
    hp: 6,
    atk: 1,
    elementStacks: { fire: 0, water: 0 }
  });
  state.placements.set(key(8, 1), {
    row: 8,
    col: 1,
    kind: 'ally_pet',
    refId: 'pal_004',
    displayName: '翠叶鼠',
    hp: 10,
    atk: 3,
    elementStacks: { fire: 0, water: 0 }
  });
}

function bindEvents() {
  document.addEventListener('input', (event) => {
    if (event.target.matches('input, textarea, select')) update();
  });
  $('puzzle-board').addEventListener('click', (event) => {
    const cell = event.target.closest('[data-row][data-col]');
    if (!cell) return;
    state.selectedCell = { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
    if (state.selectedKind !== 'empty') placeSelectedCell();
    else {
      state.placements.delete(key(state.selectedCell.row, state.selectedCell.col));
      update();
    }
  });
  qsa('.mode-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedKind = button.dataset.kind;
      qsa('.mode-btn').forEach((item) => item.classList.toggle('active', item === button));
      const defaults = {
        ally_pet: ['棉悠悠', 6, 1],
        boss: ['铁壳考官', 90, 0],
        enemy: ['训练怪', 20, 2],
        fire_element: ['火元素', 0, 0],
        water_element: ['水元素', 0, 0],
        wind_element: ['风元素', 0, 0],
        fire_trap: ['火陷阱', 0, 0],
        empty: ['', 0, 0]
      }[state.selectedKind] || ['', 0, 0];
      $('placement-name').value = defaults[0];
      $('placement-hp').value = defaults[1];
      $('placement-atk').value = defaults[2];
      renderStatus();
    });
  });
  $('apply-cell-btn').addEventListener('click', placeSelectedCell);
  $('clear-cell-btn').addEventListener('click', () => {
    state.placements.delete(key(state.selectedCell.row, state.selectedCell.col));
    update();
  });
  $('add-boss-btn').addEventListener('click', () => {
    state.selectedKind = 'boss';
    state.selectedCell = { row: 5, col: 6 };
    $('placement-name').value = '铁壳考官';
    $('placement-hp').value = '90';
    $('placement-atk').value = '0';
    placeSelectedCell();
  });
  $('enemy-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-focus-cell]');
    if (!button) return;
    const [row, col] = button.dataset.focusCell.split(',').map(Number);
    state.selectedCell = { row, col };
    update();
  });
  $('normalize-btn').addEventListener('click', applyNaturalLanguageDraft);
  qsa('.export-tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.exportMode = button.dataset.export;
      qsa('.export-tab').forEach((item) => item.classList.toggle('active', item === button));
      renderExport();
    });
  });
  $('copy-export-btn').addEventListener('click', async () => {
    await navigator.clipboard?.writeText($('export-output').textContent || '');
    $('copy-export-btn').textContent = '已复制';
    setTimeout(() => { $('copy-export-btn').textContent = '复制当前导出'; }, 1200);
  });
}

renderPetList();
renderAxes();
seedDefaultPuzzle();
bindEvents();
update();
