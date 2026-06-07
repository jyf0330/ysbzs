/**
 * battleTrace.js — 结构化战斗事件战报模块
 *
 * 职责：
 * 1. initBattleTrace() — 初始化 G.battleTrace[]
 * 2. recordTrace(data) — 在战斗结算关键点记录一条 trace 事件
 * 3. generateBattleTextReport(events) — 纯文本战报（只读 events，不重算）
 * 4. exportBattleTrace() — 导出 JSON 字符串
 *
 * 约束：纯核心纯模块，不碰 DOM/UI，不结算伤害。
 * 加载顺序：battleLog.js → battleTrace.js → battle.js
 */

// ========== 初始化 ==========

function initBattleTrace() {
  if (typeof G === 'undefined' || !G) return;
  G.battleTrace = [];
  G.battleTraceStep = 0;
}

// ========== 记录一条 trace 事件 ==========

/**
 * 在真实结算之后记录一条结构化事件。
 * 所有数值必须在调用时已确定并传入 data；本函数不反推、不计算伤害。
 *
 * @param {object} data — 事件字段，自动注入 day/phase/round/step
 * @returns {object|null} 记录的事件，失败返回 null
 */
function recordTrace(data) {
  if (!G) return null;
  if (!Array.isArray(G.battleTrace)) G.battleTrace = [];
  G.battleTraceStep = (G.battleTraceStep || 0) + 1;

  var event = {
    step: G.battleTraceStep,
    day: G.day,
    phase: G.phase,
    round: G.round,
    dayHalf: G.dayHalf,
  };

  if (data && typeof data === 'object') {
    for (var k in data) {
      if (Object.prototype.hasOwnProperty.call(data, k)) {
        event[k] = data[k];
      }
    }
  }

  G.battleTrace.push(event);
  return event;
}

// ========== 元素名映射（纯文本战报用）==========

var _BT_EL_NAMES = {
  fire: '火',
  water: '水',
  wind: '风',
  earth: '土',
};

function _elName(el) { return _BT_EL_NAMES[el] || el || ''; }

// ========== 辅助函数 ==========

/** 将槽位索引列表格式化为"第1~3槽"或"第1/2槽"等 */
function _formatSlotStr(slots) {
  if (!slots || slots.length === 0) return '';
  var sorted = slots.slice().sort(function(a, b) { return a - b; });
  var segments = [];
  var rangeStart = sorted[0], rangeEnd = sorted[0];
  for (var i = 1; i < sorted.length; i++) {
    if (sorted[i] === rangeEnd + 1) {
      rangeEnd = sorted[i];
    } else {
      segments.push(rangeStart === rangeEnd ? '' + (rangeStart + 1) : (rangeStart + 1) + '~' + (rangeEnd + 1));
      rangeStart = rangeEnd = sorted[i];
    }
  }
  segments.push(rangeStart === rangeEnd ? '' + (rangeStart + 1) : (rangeStart + 1) + '~' + (rangeEnd + 1));
  return '第' + segments.join('/') + '槽';
}

/** 统一格式化 HP 显示，始终含 before→after */
function _formatHpStr(hpBefore, hpAfter) {
  if (hpBefore === undefined || hpAfter === undefined) return '';
  if (hpBefore === hpAfter) return '，HP ' + hpBefore + '→' + hpAfter + '（未受伤）';
  return '，HP ' + hpBefore + '→' + hpAfter;
}

/** 统一格式化层数变化显示 */
function _formatLayerStr(elName, layerBefore, layerAfter) {
  if (layerBefore === undefined || layerAfter === undefined) return '';
  if (layerBefore !== layerAfter) return '，' + elName + '层 ' + layerBefore + '→' + layerAfter;
  return '，' + elName + '层 ' + layerAfter;
}

/** 程序坐标 (r,c) 转为中文第X行第Y列 */
function _boardPosStr(cell) {
  if (!cell || cell.r === undefined || cell.c === undefined) return '';
  return '第' + (cell.r + 1) + '行第' + (cell.c + 1) + '列';
}

/** 从事件中收集英雄名称（去重） */
function _collectHeroNames(events) {
  var names = [];
  events.forEach(function(e) {
    if (e.actorSide === 'player' && e.actorName && names.indexOf(e.actorName) < 0) {
      names.push(e.actorName);
    }
  });
  return names;
}

/** 从事件中收集英雄信息（名称+HP），优先从 G.heroes 取 HP */
function _collectHeroInfo(events) {
  var results = [];
  var seen = {};
  events.forEach(function(e) {
    if (e.actorSide === 'player' && e.actorName && !seen[e.actorName]) {
      seen[e.actorName] = true;
      var hpStr = '';
      if (typeof G !== 'undefined' && G.heroes && e.actorId && G.heroes[e.actorId]) {
        var h = G.heroes[e.actorId];
        if (h && h.hp !== undefined) hpStr = ' HP ' + h.hp;
      }
      results.push(e.actorName + hpStr);
    }
  });
  return results;
}

/** 将怪物 map 的值转成展示字符串（"HP="→"HP "） */
function _monsterValuesToDisplay(monsterMap) {
  var list = [];
  for (var key in monsterMap) {
    if (Object.prototype.hasOwnProperty.call(monsterMap, key)) {
      list.push(monsterMap[key].replace('HP=', 'HP '));
    }
  }
  return list;
}

/** 收集本回合内的怪物，用于初始状态行 */
function _collectRoundMonsters(events, startIdx, round, monsterMap, showCoords) {
  for (var j = startIdx; j < events.length; j++) {
    var ej = events[j];
    if (ej.round !== undefined && ej.round !== round) break;
    if (ej.targetName && !monsterMap[ej.targetName] && (ej.actionType === '施加元素' || ej.actionType === '攻击' || ej.actionType === '元素伤害')) {
      var desc = ej.targetName;
      if (showCoords && ej.targetCell) desc += ' (' + ej.targetCell.r + ',' + ej.targetCell.c + ')';
      if (ej.hpBefore !== undefined) desc += ' HP=' + ej.hpBefore;
      monsterMap[ej.targetName] = desc;
    }
  }
}

// ========== 文字战报生成入口 ==========

/**
 * 从已记录的结构化 events 生成纯文本战斗过程。
 * 不重新计算任何伤害、不反推规则，只读取 events 里的已有字段。
 * 不修改 events 原数组。
 *
 * @param {object[]} events — G.battleTrace 等结构化事件数组
 * @param {object} [options]
 * @param {string} [options.mode='compact'] — 'compact' | 'detail' | 'debug'
 * @param {boolean} [options.showCoords=false] — 是否显示坐标
 * @param {boolean} [options.groupByRound=true] — 按回合分组
 * @param {boolean} [options.groupSlotHits=true] — 槽内连击合并
 * @param {boolean} [options.showEmptyCellHits=false] — 是否显示空地上的元素施加
 * @param {boolean} [options.showEmoji=false] — 是否显示 emoji
 * @returns {string} 多行文本战报
 */
function generateBattleTextReport(events, options) {
  if (!Array.isArray(events) || events.length === 0) {
    return '（无战斗事件）';
  }

  var opts = options || {};
  var mode = opts.mode || 'compact';
  var showCoords = !!opts.showCoords;
  var groupByRound = opts.groupByRound !== false;
  var groupSlotHits = opts.groupSlotHits !== false;
  var showEmptyCellHits = !!opts.showEmptyCellHits;
  var showEmoji = !!opts.showEmoji;

  switch (mode) {
    case 'debug':
      return _reportDebug(events, showCoords);
    case 'detail':
      return _reportDetail(events, { showCoords: showCoords, showEmptyCellHits: showEmptyCellHits, groupByRound: groupByRound, showEmoji: showEmoji });
    default:
      return _reportCompact(events, { showCoords: showCoords, showEmptyCellHits: showEmptyCellHits, groupSlotHits: groupSlotHits, showEmoji: showEmoji });
  }
}

// ========== 调试战报 debug ==========

function _reportDebug(events, showCoords) {
  var lines = [];
  events.forEach(function(e) {
    var parts = [];
    parts.push('step=' + e.step);

    // 对 reason=元素结算 的攻击事件显示为"伤害"
    var actionLabel = e.actionType || '?';
    if (actionLabel === '攻击' && e.reason && e.reason.indexOf('元素结算') >= 0) {
      actionLabel = '伤害';
    }
    parts.push(actionLabel);

    if (e.actorName) parts.push(e.actorName);
    else if (e.actorId) parts.push(e.actorId);

    if (e.sourceSlot !== undefined) parts.push('slot=' + (e.sourceSlot + 1));
    if (e.targetName) parts.push(e.targetName);
    if (showCoords && e.targetCell) parts.push('(' + e.targetCell.r + ',' + e.targetCell.c + ')');

    if (e.element) parts.push(_elName(e.element));
    if (e.layerBefore !== undefined) parts.push('layer=' + e.layerBefore + '->' + (e.layerAfter !== undefined ? e.layerAfter : '?'));

    if (e.damage !== undefined) parts.push('damage=' + e.damage);
    if (e.hpBefore !== undefined && e.hpAfter !== undefined) parts.push('HP=' + e.hpBefore + '->' + e.hpAfter);
    if (e.killed) parts.push('killed=true');
    if (e.reason) parts.push(e.reason);

    lines.push(parts.join(' | '));
  });
  return lines.join('\n');
}

// ========== 详细战报 detail ==========

function _reportDetail(events, opts) {
  var showCoords = opts && opts.showCoords;
  var showEmpty = opts && opts.showEmptyCellHits;
  var showEmoji = opts && opts.showEmoji;
  var lines = [];
  var lastDay = -1, lastRound = 0;
  var roundHeroesSeen = {};

  // 初始状态收集（第1个事件前的快照——从事件数据推断）
  var heroNames = [];
  var monsterNames = [];
  events.forEach(function(e) {
    if (e.actorSide === 'player' && e.actorName && heroNames.indexOf(e.actorName) < 0) {
      heroNames.push(e.actorName);
    }
    if (e.targetName && e.targetName !== 'playerCastle' && monsterNames.indexOf(e.targetName) < 0) {
      if (e.actionType === '施加元素' || e.actionType === '攻击' || e.actionType === '元素伤害') {
        monsterNames.push(e.targetName);
      }
    }
  });

  var i = 0;
  while (i < events.length) {
    var e = events[i];

    // ---- 段首：第N天 / 第N回合 ----
    if (e.day !== undefined && e.day !== lastDay) {
      if (lines.length > 0) lines.push('');
      var dayLabel = '第' + e.day + '天';
      if (e.dayHalf === 0) dayLabel += '上午';
      else if (e.dayHalf === 1) dayLabel += '下午';
      else if (e.dayHalf === 2) dayLabel += '夜晚';
      lines.push('【' + dayLabel + '】');
      lastDay = e.day;
      roundHeroesSeen = {};
    }
    if (e.round !== undefined && e.round !== lastRound) {
      if (lines.length > 0 && lines[lines.length-1] !== '') lines.push('');
      lines.push('第' + e.round + '回合。');
      lastRound = e.round;
      roundHeroesSeen = {};

      // 初始怪物状态
      if (i + 1 < events.length) {
        var roundMonsters = [];
        var seenMonIds = {};
        for (var j = i; j < events.length; j++) {
          var ej = events[j];
          if (ej.round !== undefined && ej.round !== e.round) break;
          if (ej.targetName && (ej.actionType === '施加元素' || ej.actionType === '攻击' || ej.actionType === '元素伤害') && !seenMonIds[ej.targetName]) {
            seenMonIds[ej.targetName] = true;
            var hpStr = '';
            if (ej.hpBefore !== undefined) hpStr = ' HP=' + ej.hpBefore;
            var coordStr = '';
            if (showCoords && ej.targetCell) coordStr = ' (' + ej.targetCell.r + ',' + ej.targetCell.c + ')';
            roundMonsters.push(ej.targetName + coordStr + hpStr);
          }
        }
        if (roundMonsters.length > 0) {
          lines.push('敌方：' + roundMonsters.join('、') + '。');
        }
        lines.push('');
        lines.push('【我方行动】');
      }
    }

    // ---- 事件行 ----
    var line = _formatDetailLine(e, showCoords, showEmpty, showEmoji);
    if (line) {
      if (e.actionType === '元素伤害' || e.actionType === '引爆') {
        if (lines.length > 0 && lines[lines.length-1] !== '') lines.push('');
        lines.push('【统一结算】');
      }
      if (e.actionType === '奖励') {
        if (lines.length > 0 && lines[lines.length-1] !== '') lines.push('');
        lines.push('【奖励】');
      }
      lines.push(line);
    }
    i++;
  }

  return lines.join('\n');
}

function _formatDetailLine(e, showCoords, showEmpty, showEmoji) {
  var emoji = showEmoji ? '💀 ' : '';

  switch (e.actionType) {
    case '施加元素': {
      var actor = e.actorName || '';
      var slotInfo = '';
      if (e.sourceSlot !== undefined) {
        slotInfo = '第' + (e.sourceSlot + 1) + '槽：';
      }
      var target = '';
      if (e.targetName) {
        target = e.targetName;
        if (showCoords && e.targetCell) target += ' (' + e.targetCell.r + ',' + e.targetCell.c + ')';
      } else if (e.targetCell) {
        if (showEmpty === false) return null;
        target = '空地';
        if (showCoords) target += ' (' + e.targetCell.r + ',' + e.targetCell.c + ')';
      } else {
        return null;
      }
      var elN = _elName(e.element);
      var layerInfo = _formatLayerStr(elN, e.layerBefore, e.layerAfter);
      var hpInfo = _formatHpStr(e.hpBefore, e.hpAfter);
      return actor + slotInfo + '命中' + target + layerInfo + hpInfo + '。';
    }

    case '元素伤害': {
      var target = e.targetName || '';
      if (!target && e.targetCell) target = '(' + e.targetCell.r + ',' + e.targetCell.c + ')';
      var elName = _elName(e.element);
      var layerInfo = e.layerBefore !== undefined ? e.layerBefore + '层' : '';
      // detail 模式保留触发描述，区分战场引爆和怪物身上层
      return '『' + target + '』身上' + elName + layerInfo + '参与' + elName + '元素结算。';
    }

    case '攻击': {
      var tgt = e.targetName || '';
      if (!tgt && e.targetCell) tgt = '(' + e.targetCell.r + ',' + e.targetCell.c + ')';

      // 元素结算伤害：合并显示
      // 攻击事件本身不含 element 字段，需要向前查找元素名称
      if (e.reason && e.reason.indexOf('元素结算') >= 0) {
        var elN = e.element ? _elName(e.element) : '';
        if (!elN) {
          // 从 detail 函数上下文无法直接访问 events 数组，改用 actorName 提取
          var srcStr = e.actorName || e.reason || '';
          if (srcStr.indexOf('火') >= 0) elN = '火';
          else if (srcStr.indexOf('水') >= 0) elN = '水';
          else if (srcStr.indexOf('风') >= 0) elN = '风';
          else if (srcStr.indexOf('土') >= 0) elN = '土';
        }
        var dmgInfo = '';
        if (e.damage !== undefined) dmgInfo = '受到' + e.damage + '点' + (elN || '') + '元素伤害';
        var hpInfo = _formatHpStr(e.hpBefore, e.hpAfter);
        var deadMark = e.killed ? '，死亡！' : '';
        return tgt + dmgInfo + hpInfo + deadMark;
      }

      var dmgInfo = '';
      if (e.damage !== undefined) dmgInfo = '受到' + e.damage + '点伤害';
      var hpInfo = _formatHpStr(e.hpBefore, e.hpAfter);
      var deadMark = e.killed ? '，死亡！' : '';
      var src = e.actorName || '';
      // 如果 actorName 含"结算"等后缀，简化显示
      if (src.indexOf('结算') >= 0) src = '';
      var prefix = e.killed ? emoji : '';
      var extra = '';
      if (e.actorSide === 'monster') {
        extra = '怪物' + src + '攻击' + tgt + '，造成' + (e.damage !== undefined ? e.damage + '点伤害' : '伤害') + hpInfo + deadMark;
      } else {
        extra = tgt + dmgInfo + hpInfo + deadMark;
      }
      return prefix + extra;
    }

    case '引爆': {
      var elN = _elName(e.element);
      var lInfo = e.layerBefore !== undefined ? e.layerBefore + '层' : '';
      var cellInfo = '';
      if (e.targetCell && showCoords) cellInfo = ' (' + e.targetCell.r + ',' + e.targetCell.c + ')';
      // 区分战场引爆描述
      return '战场' + elN + '层达到' + lInfo + '，触发' + elN + '元素引爆' + cellInfo + '。';
    }

    case '移动': {
      var mover = e.actorName || '';
      var fromS = '';
      if (e.fromCell) fromS = ' (' + e.fromCell.r + ',' + e.fromCell.c + ')→';
      var toS = '';
      if (e.targetCell) toS = ' (' + e.targetCell.r + ',' + e.targetCell.c + ')';
      return mover + fromS + toS + '。';
    }

    case 'battle_start':
    case '英雄移动':
    case '我方回合结束':
    case '回合结束':
      // detail 模式跳过新战报结构事件
      return null;

    case '奖励':
      return e.message || '获得奖励。';

    case '死亡':
      return (showEmoji ? '💀 ' : '') + (e.actorName || e.targetName || '单位') + ' 死亡！';

    default:
      return e.message || (e.actionType || '') + ' ' + JSON.stringify(e);
  }
}

// ========== 简洁战报 compact ==========

function _reportCompact(events, opts) {
  var showCoords = !!opts && !!opts.showCoords;
  var showEmoji = !!opts && !!opts.showEmoji;
  var lines = [];

  // Phase 1: 开场布局
  _outputBattleStartLayout(lines, events);

  // Phase 2: 逐回合处理
  var currentRound = 0;
  var roundSections = {}; // { round: { heroMove:bool, playerAtk:bool, settlement:bool, enemyAction:bool } }
  var i = 0;

  while (i < events.length) {
    var e = events[i];

    // 跳过布局和回合结束事件（布局在开头处理，回合结束在结尾处理）
    if (e.actionType === 'battle_start') { i++; continue; }

    var eventRound = e.round || currentRound;
    if (eventRound > 0 && eventRound !== currentRound) {
      // 输出上一回合结束
      if (currentRound > 0) {
        var prevRoundEnd = _findRoundEndEvent(events, currentRound);
        if (!prevRoundEnd) _outputRoundEndSummary(lines, events, currentRound);
      }
      currentRound = eventRound;
      roundSections[eventRound] = {};
      if (currentRound > 1) {
        lines.push('');
        lines.push('【第' + currentRound + '回合开始】');
      }
    } else if (currentRound === 0 && eventRound > 0) {
      currentRound = eventRound;
      roundSections[eventRound] = {};
    }

    // ---- 英雄移动 ----
    if (e.actionType === '英雄移动') {
      _ensureSection(lines, roundSections[currentRound], 'heroMove', '【我方移动】');
      var fromStr = e.fromCell ? _boardPosStr(e.fromCell) : '未知';
      var toStr = e.targetCell ? _boardPosStr(e.targetCell) : '未知';
      lines.push(e.actorName + '从' + fromStr + '移动到' + toStr + '。');
      i++;
      continue;
    }

    // ---- 我方攻击（合并连续施加元素）----
    if (e.actionType === '施加元素' && opts.groupSlotHits !== false) {
      _ensureSection(lines, roundSections[currentRound], 'playerAtk', '【我方攻击】');
      var groupActor = e.actorName;
      var groupEl = e.element;
      var groupSlots = [];
      var monsterHits = {};
      var firstSlots = [];

      while (i < events.length && events[i].actionType === '施加元素' && events[i].actorName === groupActor) {
        var ce = events[i];
        if (groupSlots.indexOf(ce.sourceSlot) < 0) {
          groupSlots.push(ce.sourceSlot);
          firstSlots.push({ slot: ce.sourceSlot, targetCell: ce.targetCell, targetName: ce.targetName || '空地' });
        }
        if (ce.targetName) {
          if (!monsterHits[ce.targetName]) {
            monsterHits[ce.targetName] = {
              firstLayerBefore: ce.layerBefore, lastLayerAfter: ce.layerAfter,
              firstHpBefore: ce.hpBefore, lastHpAfter: ce.hpAfter,
              coords: ce.targetCell
            };
          } else {
            monsterHits[ce.targetName].lastLayerAfter = ce.layerAfter;
            if (ce.hpAfter !== undefined) monsterHits[ce.targetName].lastHpAfter = ce.hpAfter;
          }
        }
        i++;
      }

      // 攻击行：英雄位置 + 槽位 + 目标
      var heroPos = _findHeroPosInRound(events, groupActor, i);
      var posStr = heroPos ? '位于' + _boardPosStr(heroPos) + '，' : '';
      var slotStr = _formatSlotStr(groupSlots);
      var elN = _elName(groupEl);
      lines.push(groupActor + posStr + '发动' + slotStr + '，叠加' + elN + '元素。');

      Object.keys(monsterHits).forEach(function(mname) {
        var mh = monsterHits[mname];
        var layerChange = _formatLayerStr(elN, mh.firstLayerBefore, mh.lastLayerAfter);
        var hpStr = _formatHpStr(mh.firstHpBefore, mh.lastHpAfter);
        var coordStr = showCoords && mh.coords ? '命中位于' + _boardPosStr(mh.coords) + '的' : '命中';
        lines.push(coordStr + mname + layerChange + hpStr + '。');
      });
      continue;
    }

    // ---- 我方结束回合 ----
    if (e.actionType === '我方回合结束') {
      _ensureSection(lines, roundSections[currentRound], 'endTurn', '【我方结束回合】');
      i++;
      continue;
    }

    // ---- 统一结算（合并元素伤害/引爆/元素结算攻击）----
    if (e.actionType === '元素伤害' || e.actionType === '引爆') {
      // 在 compact 中跳过文字行，等后面的攻击事件合并时再输出章节头部
      i++;
      continue;
    }
    if (e.actionType === '攻击' && e.reason && e.reason.indexOf('元素结算') >= 0) {
      _ensureSection(lines, roundSections[currentRound], 'settlement', '【统一结算】');
      var dmgLine = _formatCompactElementDmgLine(e, events, i, showEmoji);
      lines.push(dmgLine);
      i++;
      continue;
    }

    // ---- 敌方行动（移动 + 攻击）----
    if (e.actionType === '移动') {
      _ensureSection(lines, roundSections[currentRound], 'enemyAction', '【敌方行动】');
      lines.push(_formatEnemyMoveLine(e));
      i++;
      continue;
    }
    if (e.actionType === '攻击' && e.actorSide === 'monster') {
      _ensureSection(lines, roundSections[currentRound], 'enemyAction', '【敌方行动】');
      var emoji = showEmoji ? '💀 ' : '';
      var tgt = e.targetName || '';
      var dmgInfo = e.damage !== undefined ? '造成' + e.damage + '点伤害' : '攻击';
      var hpInfo = _formatHpStr(e.hpBefore, e.hpAfter);
      var deadStr = e.killed ? '，死亡！' : '';
      lines.push(emoji + e.actorName + dmgInfo + tgt + hpInfo + deadStr);
      i++;
      continue;
    }

    // ---- 城堡行动 ----
    if (e.actionType === '城堡行动') {
      _ensureSection(lines, roundSections[currentRound], 'castleAction', '【城堡行动】');
      lines.push(e.message || '');
      i++;
      continue;
    }

    // ---- 回合结束 ----
    if (e.actionType === '回合结束') {
      lines.push('');
      var roundNum = e.round || currentRound;
      lines.push('【第' + roundNum + '回合结束】');
      // 状态摘要
      if (e.heroes && e.heroes.length > 0) {
        lines.push('我方：' + e.heroes.map(function(h) { return h.name + ' HP ' + h.hp; }).join('、') + '。');
      }
      if (e.monsters && e.monsters.length > 0) {
        lines.push('敌方：' + e.monsters.map(function(m) { return m.name + ' HP ' + m.hp; }).join('、') + '。');
      } else {
        lines.push('敌方：已全部消灭。');
      }
      i++;
      continue;
    }

    // ---- 奖励 — 跳过（由战斗结果处理）----
    if (e.actionType === '奖励') { i++; continue; }

    // ---- 其他事件 ----
    var line = _formatCompactLine(e, showCoords, showEmoji);
    if (line) lines.push(line);
    i++;
  }

  // 收尾：最后一轮回合结束
  if (!events.some(function(ee) { return ee.actionType === '回合结束'; })) {
    _outputRoundEndSummary(lines, events, currentRound);
  }

  // ---- 战斗结果 ----
  _appendCompactBattleResult(lines, events);

  return lines.join('\n');
}

/** 确保某 section 的 header 已写入 */
function _ensureSection(lines, sectionTracker, key, header) {
  if (!sectionTracker) return;
  if (!sectionTracker[key]) {
    sectionTracker[key] = true;
    lines.push(header);
  }
}

/** 从 battle_start 事件或事件扫描中输出开场布局 */
function _outputBattleStartLayout(lines, events) {
  var bs = null;
  for (var k = 0; k < events.length; k++) {
    if (events[k].actionType === 'battle_start') { bs = events[k]; break; }
  }

  if (bs && bs.heroes) {
    lines.push('【开场布局 · 我方】');
    bs.heroes.forEach(function(h) {
      lines.push(h.name + '，位于' + _boardPosStr(h.pos) + '，HP ' + h.hp + '。');
    });
  } else {
    // 回退：从事件中推导
    var heroInfos = _collectHeroInfo(events);
    if (heroInfos.length > 0) {
      lines.push('【开场布局 · 我方】');
      heroInfos.forEach(function(hi) {
        lines.push(hi + '，位置未知。');
      });
    }
  }

  if (bs && bs.monsters && bs.monsters.length > 0) {
    lines.push('【开场布局 · 敌方】');
    bs.monsters.forEach(function(m) {
      lines.push(m.name + '，位于' + _boardPosStr(m.pos) + '，HP ' + m.hp + '。');
    });
  } else {
    // 回退：扫描事件
    var seenMon = {};
    var monInfos = [];
    events.forEach(function(e) {
      if (e.targetName && !seenMon[e.targetName] && e.targetCell && (e.actionType === '施加元素' || e.actionType === '攻击' || e.actionType === '元素伤害')) {
        seenMon[e.targetName] = true;
        var hpStr = e.hpBefore !== undefined ? '，HP ' + e.hpBefore : '';
        monInfos.push(e.targetName + '，位于' + _boardPosStr(e.targetCell) + hpStr + '。');
      }
    });
    if (monInfos.length > 0) {
      lines.push('【开场布局 · 敌方】');
      monInfos.forEach(function(mi) { lines.push(mi); });
    }
  }
}

/** 查找英雄在当前处理位置之前的最终位置 */
function _findHeroPosInRound(events, actorName, currentIdx) {
  var limit = (currentIdx !== undefined && currentIdx < events.length) ? currentIdx : events.length;
  // 从当前位置向前搜索最近的 英雄移动
  for (var k = limit - 1; k >= 0; k--) {
    if (events[k].actionType === '英雄移动' && events[k].actorName === actorName && events[k].targetCell) {
      return events[k].targetCell;
    }
  }
  // 回退：从 G.heroes 读取
  if (typeof G !== 'undefined' && G.heroes) {
    for (var hid in G.heroes) {
      if (G.heroes[hid].name === actorName) return G.heroes[hid].pos;
    }
  }
  return null;
}

/** 敌方移动格式化 */
function _formatEnemyMoveLine(e) {
  if (!e.fromCell && !e.targetCell) return e.actorName + '移动。';
  var fromS = e.fromCell ? _boardPosStr(e.fromCell) : '';
  var toS = e.targetCell ? _boardPosStr(e.targetCell) : '';
  if (fromS && toS) {
    return e.actorName + '从' + fromS + '移动到' + toS + '。';
  }
  return e.actorName + '移动到' + (toS || '未知') + '。';
}

/** 查找回合结束事件 */
function _findRoundEndEvent(events, round) {
  for (var k = events.length - 1; k >= 0; k--) {
    if (events[k].actionType === '回合结束' && events[k].round === round) return events[k];
  }
  return null;
}

/** 从事件推导回合结束摘要（无 回合结束 事件时的回退） */
function _outputRoundEndSummary(lines, events, round) {
  if (!round || round <= 0) return;
  // 收集本回合最后的英雄和怪物状态
  var heroMap = {}, monsterMap = {};
  for (var k = 0; k < events.length; k++) {
    var e = events[k];
    if ((e.round || round) !== round) continue;
    if (e.actorSide === 'player' && e.actorName && !heroMap[e.actorName]) {
      heroMap[e.actorName] = true;
    }
    if (e.targetName && e.hpAfter !== undefined && (e.actionType === '攻击' || e.actionType === '施加元素') && e.actorSide !== 'player' && !monsterMap[e.targetName]) {
      // 怪物如果已经死亡，可能不再出现
    }
  }
  // Fallback: use hero names from events
  var heroNames2 = [];
  events.forEach(function(ev) {
    if (ev.actorSide === 'player' && ev.actorName && heroNames2.indexOf(ev.actorName) < 0) {
      heroNames2.push(ev.actorName);
    }
  });
  lines.push('');
  lines.push('【第' + round + '回合结束】');
  if (heroNames2.length > 0) {
    var hpParts = heroNames2.map(function(n) {
      var hp = '';
      if (typeof G !== 'undefined' && G.heroes) {
        for (var hid in G.heroes) {
          if (G.heroes[hid].name === n) { hp = ' HP ' + G.heroes[hid].hp; break; }
        }
      }
      return n + hp;
    });
    lines.push('我方：' + hpParts.join('、') + '。');
  }
  // 敌方：从事件最后出现的存活怪物判断
  var lastMonsters = {};
  for (var k2 = events.length - 1; k2 >= 0; k2--) {
    var ev = events[k2];
    if ((ev.round || round) !== round) continue;
    if (ev.targetName && ev.hpAfter !== undefined && ev.hpAfter > 0 && !lastMonsters[ev.targetName]) {
      lastMonsters[ev.targetName] = ev.hpAfter;
    }
  }
  if (Object.keys(lastMonsters).length > 0) {
    lines.push('敌方：' + Object.keys(lastMonsters).map(function(n) { return n + ' HP ' + lastMonsters[n]; }).join('、') + '。');
  }
}

/** 格式化元素结算的 攻击 事件（与前置 引爆/元素伤害 合并） */
function _formatCompactElementDmgLine(e, events, currentIdx, showEmoji) {
  var targetName = e.targetName || '';
  var elName = e.element ? _elName(e.element) : '';

  // 向前查找最新的 元素伤害/引爆 事件获取层数信息
  var layerInfo = '';
  var prevLayer = undefined;
  for (var k = currentIdx - 1; k >= 0; k--) {
    var pk = events[k];
    if (pk.actionType === '元素伤害' && pk.targetName === targetName) {
      prevLayer = pk.layerBefore;
      if (!elName) elName = _elName(pk.element);
      break;
    }
    if (pk.actionType === '引爆') {
      prevLayer = pk.layerBefore;
      if (!elName) elName = _elName(pk.element);
      break;
    }
  }

  if (prevLayer !== undefined && elName) {
    // 如果是 元素伤害 有指定 target，用 "身上X层"
    // 如果是 引爆 无指定 target，用战场层
    var hasSpecificTarget = false;
    for (var k2 = currentIdx - 1; k2 >= 0; k2--) {
      if (events[k2].actionType === '元素伤害' && events[k2].targetName === targetName) {
        hasSpecificTarget = true;
        break;
      }
      if (events[k2].actionType === '元素伤害' || events[k2].actionType === '引爆') break;
    }
    if (hasSpecificTarget) {
      layerInfo = targetName + '身上' + elName + prevLayer + '层，';
    } else {
      layerInfo = '';
    }
  }

  var dmgInfo = '';
  if (e.damage !== undefined) dmgInfo = '受到' + e.damage + '点' + (elName || '') + '元素伤害';
  var hpInfo = _formatHpStr(e.hpBefore, e.hpAfter);
  var deadMark = e.killed ? '，死亡！' : '';

  // 如果 layerInfo 已包含目标名（如 "喵丝特身上火6层，"），不再重复
  if (layerInfo) {
    return layerInfo + dmgInfo + hpInfo + deadMark;
  }
  return targetName + dmgInfo + hpInfo + deadMark;
}

function _formatCompactLine(e, showCoords, showEmoji) {
  var emoji = showEmoji ? '💀 ' : '';

  switch (e.actionType) {

    case '施加元素': {
      // 未被合并的单个施加元素（groupSlotHits=false 时）
      var actor = e.actorName || '';
      var slotInfo = '';
      if (e.sourceSlot !== undefined) slotInfo = '第' + (e.sourceSlot + 1) + '槽';
      var target = e.targetName || '';
      var coordStr = '';
      if (showCoords && e.targetCell) coordStr = ' (' + e.targetCell.r + ',' + e.targetCell.c + ')';
      var elN = _elName(e.element);
      var layerInfo = _formatLayerStr(elN, e.layerBefore, e.layerAfter);
      var hpInfo = _formatHpStr(e.hpBefore, e.hpAfter);
      return actor + slotInfo + '叠加' + elN + '→' + target + coordStr + layerInfo + hpInfo + '。';
    }

    case '元素伤害':
      // compact 模式下被跳过，合并到攻击行
      return null;

    case '攻击': {
      var tgt = e.targetName || '';
      var dmgInfo = '';
      if (e.damage !== undefined) dmgInfo = '受到' + e.damage + '点伤害';
      var hpInfo = _formatHpStr(e.hpBefore, e.hpAfter);
      var deadStr = e.killed ? '，死亡！' : '';
      var prefix = e.killed ? emoji : '';
      var src = e.actorName || '';
      if (src.indexOf('结算') >= 0) src = '';
      if (e.actorSide === 'monster') {
        return prefix + src + '攻击' + tgt + dmgInfo + hpInfo + deadStr;
      }
      return prefix + tgt + dmgInfo + hpInfo + deadStr;
    }

    case '引爆':
      // compact 模式下被跳过
      return null;

    case '移动': {
      var mover = e.actorName || '';
      var from = e.fromCell ? '(' + e.fromCell.r + ',' + e.fromCell.c + ')' : '';
      var to = e.targetCell ? '(' + e.targetCell.r + ',' + e.targetCell.c + ')' : '';
      return mover + ' ' + from + '→' + to + '。';
    }

    case '奖励':
      return e.message || '获得奖励。';

    case '死亡':
      return emoji + (e.actorName || e.targetName || '单位') + ' 死亡！';

    default:
      return e.message || (e.actionType || '') + ' ' + JSON.stringify(e);
  }
}

/** 追加战斗结果行（compact 模式尾部） */
function _appendCompactBattleResult(lines, events) {
  var resultLine = '';
  events.forEach(function(e) {
    if (e.actionType === '奖励' && e.message) {
      // "完美回合！连锁清场 +3 金" → "战斗结果：完美回合，连锁清场，金币 +3。"
      var msg = e.message;
      msg = msg.replace(/[！!]/g, '，');
      msg = msg.replace(/\s*\+(\d+)\s*金/g, '，金币 +$1');
      // 保证不以逗号结尾
      if (msg.charAt(msg.length - 1) === '，') {
        msg = msg.slice(0, -1);
      }
      resultLine = '战斗结果：' + msg + '。';
      // 去重
      for (var li = lines.length - 1; li >= 0; li--) {
        if (lines[li].indexOf('战斗结果') >= 0) {
          lines.splice(li, 1);
        }
      }
    }
  });
  if (resultLine) lines.push(resultLine);
}

// ========== 导出 trace ==========

function exportBattleTrace() {
  if (!G || !Array.isArray(G.battleTrace)) return '[]';
  return JSON.stringify(G.battleTrace, null, 2);
}
