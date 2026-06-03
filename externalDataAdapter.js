/**
 * 元素背包史 · 外部数据适配层
 * 从 generated-json 读取数据，生成旧系统可用的结构。
 * 提供统一 Pal 单位实例化工厂 createPalUnitInstance。
 *
 * 加载顺序：在 data.js 之后、game.js/waves.js/shop.js 之前加载。
 */
(function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis : window;
  if (g.__EXTERNAL_DATA_ADAPTER_ACTIVE__) return;
  g.__EXTERNAL_DATA_ADAPTER_ACTIVE__ = true;

  var fs = (typeof require !== 'undefined') ? require('fs') : null;
  var pj = (typeof require !== 'undefined') ? require('path') : null;
  var ROOT = (typeof __dirname !== 'undefined') ? __dirname : '.';

  var _cache = {};

  // 浏览器运行时，从 __YSBZS_TABLES__ 读取预加载的 JSON
  var browserTables = g.__YSBZS_TABLES__ || {};

  function loadJSON(subPath) {
    var key = 'gjson/' + subPath;
    if (_cache[key]) return _cache[key];

    // 浏览器：从预加载的 __YSBZS_TABLES__ 查找
    var tableKey = subPath.replace(/\//g, '_').replace(/\.json$/, '');
    if (browserTables[tableKey]) {
      _cache[key] = browserTables[tableKey];
      return _cache[key];
    }

    // Node.js 测试环境：fs 读取
    if (fs) {
      var fp = pj.join(ROOT, 'external-data', 'generated-json', subPath);
      try {
        _cache[key] = JSON.parse(fs.readFileSync(fp, 'utf8'));
        return _cache[key];
      } catch (e) { return null; }
    }

    return null;
  }

  function getPalUnits()     { return loadJSON('pal_units.json'); }
  function getShopConfig()   { return loadJSON('shop_config.json'); }
  function getEncounter()    { return loadJSON('encounter_config.json'); }
  function getActionTpl()    { return loadJSON('action-slots/action_template_enriched.json'); }
  function getActionGrowth() { return loadJSON('action-slots/action_growth_enriched.json'); }
  function getSDRep()        { return loadJSON('attack-shapes/attack_shape_sd_replacement_22.json'); }
  function getMaster()       { return loadJSON('attack-shapes/attack_shape_master.json'); }

  // ================================================================
  // 1. 外部 UNIT_DEFS 生成（独立结构）
  // ================================================================
  function buildExternalUnitDefs() {
    var pal = getPalUnits();
    var at  = getActionTpl();
    var ag  = getActionGrowth();
    var sc  = getShopConfig();
    if (!pal || !at || !ag) return null;

    var masters = pal.pal_master || [];
    var stats   = pal.pal_stats_ysbzs || [];
    var sources = (sc && sc.shop_source) || [];

    var statByUnit = {}; stats.forEach(function (s) { statByUnit[s.unit_id] = s; });
    var srcByUnit = {}; sources.forEach(function (s) { srcByUnit[s.unit_id] = s; });

    var growthIdx = {};
    ag.forEach(function (r) { growthIdx[r.unit_id + '|' + r.slot + '|' + r.level] = r; });

    var tplIdx = {};
    at.forEach(function (r) { tplIdx[r.unit_id + '|' + r.slot] = r; });

    var defs = {};

    masters.forEach(function (m) {
      var uid = m.unit_id;
      if (!uid) return;
      var bs = statByUnit[uid] || {};
      var sr = srcByUnit[uid] || { price: 2 };
      var cost = sr.price || 2;
      var tierVal = cost <= 2 ? 1 : cost <= 4 ? 2 : cost <= 6 ? 3 : 4;

      var tags = [];
      if (m.auto_tags) {
        tags = m.auto_tags.replace(/、/g, ',').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      }
      if (tags.length === 0) tags = [m.ysbzs_element || 'wind', '通用'];

      var levels = {};
      var baseHp = bs.ysbzs_hp || 10;
      var hpScale = [1, 1.2, 1.5, 1.8];

      for (var lv = 1; lv <= 4; lv++) {
        var slots = [];
        for (var si = 1; si <= 3; si++) {
          var tpl  = tplIdx[uid + '|' + si];
          var grow = growthIdx[uid + '|' + si + '|' + lv];
          if (!tpl) continue;

          slots.push({
            el: tpl.el, sn: tpl.sn, dir: tpl.dir,
            tier: grow ? (grow.tier || lv) : lv,
            layers: grow ? (grow.layers || 1) : 1,
            value: grow ? (grow.value || 0) : 0,
            action_type: tpl.action_type,
            shape_sn: tpl.shape_sn, shape_name: tpl.shape_name, shape_cat: tpl.shape_cat,
            shape_id: tpl.shape_id, requires_full_fit: tpl.requires_full_fit,
            skill: tpl.skill_ref ? ({'summon_from_cell':'summonFromCell','heal_allied_summon':'healSummons'}[tpl.skill_ref] || tpl.skill_ref) : undefined,
            summonCount: grow ? (grow.summon_count || 0) : 0,
            summonHp: grow ? (grow.summon_hp || 0) : 0,
          });
        }
        levels[lv] = { hp: Math.round(baseHp * hpScale[lv - 1]), slots: slots };
      }

      var sizeMap = {'small': 1, 'medium': 2, 'large': 3};
      var rawSize = m.size || 'medium';

      defs[uid] = {
        id: uid, name: m.pal_name, element: m.ysbzs_element || 'wind',
        grade: m.shop_quality_base || '青铜', size: rawSize, slotSize: sizeMap[rawSize] || 2,
        priceTier: tierVal, tags: tags, tier: tierVal, cost: cost, levels: levels,
      };
    });

    return defs;
  }

  // ================================================================
  // 2. 商店池（合并新旧）
  // ================================================================
  function buildMergedShopPools() {
    var sc = getShopConfig();
    if (!sc) return null;
    var sources = sc.shop_source || [];
    if (sources.length === 0) return null;

    var byDay = {};
    sources.forEach(function (s) {
      var day = s.unlock_day || 1;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(s.unit_id);
    });

    var pools = {};
    var days = Object.keys(byDay).sort(function (a, b) { return parseInt(a) - parseInt(b); });
    days.forEach(function (day) {
      var ids = byDay[day];
      pools['day' + day + '_midday'] = ids.slice();
      pools['day' + day + '_night']  = ids.slice();
    });

    // 旧 pool 合并（只保持 getShopPoolIds 兼容）
    var oldPools = (typeof SHOP_POOLS !== 'undefined') ? SHOP_POOLS : {};
    Object.keys(oldPools).forEach(function (k) {
      if (!pools[k]) pools[k] = [];
      var oldIds = oldPools[k] || [];
      oldIds.forEach(function (id) {
        var sid = (typeof id === 'string') ? id : (id.unitId || id);
        if (pools[k].indexOf(sid) === -1) pools[k].push(sid);
      });
    });

    return pools;
  }

  // ================================================================
  // 3. 新 SD
  // ================================================================
  function buildNewSD() {
    var sdData = getSDRep();
    if (!sdData) return null;
    var items = sdData.sd_replacement_22 || sdData;
    var sd = {};
    Object.keys(items).forEach(function (snStr) {
      var item = items[snStr];
      var sn = parseInt(snStr);
      sd[sn] = {
        cells: item.cells || [],
        name: item.name || '形状' + sn,
        n: item.n || (item.cells ? item.cells.length : 0),
        cat: item.cat || 'unknown',
        status: item.status || 'core',
        shapeId: item.shapeId || '',
        requiresFullFit: item.requiresFullFit || false,
      };
    });
    return sd;
  }

  // ================================================================
  // 4. 敌人池映射 (encounter pool name -> unit IDs)
  // ================================================================
  function buildEnemyPools() {
    var pal = getPalUnits();
    if (!pal) return null;
    var masters = pal.pal_master || [];
    var usage = pal.unit_usage || [];

    var enemyUsable = {};
    usage.forEach(function (u) { if (u.can_enemy) enemyUsable[u.unit_id] = true; });

    var pools = {
      'small_bronze_pal_pool': [],
      'bronze_mixed_pal_pool': [],
      'bronze_silver_pal_pool': [],
      'silver_gold_pal_pool': [],
      'gold_pal_pool': [],
      'gold_diamond_pal_pool': [],
    };

    masters.forEach(function (m) {
      var uid = m.unit_id;
      if (!enemyUsable[uid]) return;
      var size = m.size || 'medium';
      var qual = m.shop_quality_base || '青铜';
      var qualLv = ({'青铜':1,'白银':2,'黄金':3,'钻石':4}[qual] || 1);

      // small+bronze
      if (size === 'small' && qualLv <= 1) pools.small_bronze_pal_pool.push(uid);
      // bronze mixed: any bronze
      if (qualLv <= 1) pools.bronze_mixed_pal_pool.push(uid);
      // bronze/silver
      if (qualLv <= 2) pools.bronze_silver_pal_pool.push(uid);
      // silver/gold
      if (qualLv >= 2 && qualLv <= 3) pools.silver_gold_pal_pool.push(uid);
      // gold
      if (qualLv <= 3) pools.gold_pal_pool.push(uid);
      // gold/diamond
      pools.gold_diamond_pal_pool.push(uid);
    });

    return pools;
  }

  // ================================================================
  // 5. createPalUnitInstance — 统一 Pal 实例化工厂
  // ================================================================
  function createPalUnitInstance(opts) {
    if (!opts || !opts.unitId) return null;

    var uid = opts.unitId;
    var faction = opts.faction || 'player';
    var qual = opts.quality || opts.level || 1;
    var hpMul = opts.hpMul || 1;
    var atkMul = opts.atkMul || 1;
    var pos = opts.position || null;

    // 从外部 UNIT_DEFS 获取定义
    var extDefs = g.__EXTERNAL_UNIT_DEFS__;
    var def = extDefs ? extDefs[uid] : null;
    if (!def) {
      // fallback 旧系统
      if (typeof UNIT_DEFS !== 'undefined' && UNIT_DEFS[uid]) {
        def = UNIT_DEFS[uid];
      }
    }
    if (!def) return null;

    // 品质/等级 解析
    var qualMap = {'青铜':1,'白银':2,'黄金':3,'钻石':4};
    var lv = (typeof qual === 'number') ? qual : (qualMap[qual] || 1);
    lv = Math.max(1, Math.min(4, lv));

    var lvlData = def.levels && def.levels[lv];
    if (!lvlData) lv = 1;
    lvlData = def.levels[lv];

    // Pal stats 数据
    var palRaw = g.__EXTERNAL_PAL_STATS__ || {};
    var rawStat = palRaw[uid] || {};

    // 构建实例
    var baseHp = lvlData ? lvlData.hp : 10;
    var sizeMap = {'small': 1, 'medium': 2, 'large': 3};
    var instance = {
      instanceId: null,
      unitId: uid,
      defId: uid,
      name: def.name || uid,
      faction: faction,
      size: def.size || 'medium',
      slotSize: sizeMap[def.size] || 2,
      element: def.element || 'wind',
      hp: Math.round(baseHp * hpMul),
      maxHp: Math.round(baseHp * hpMul),
      atk: Math.round((rawStat.ysbzs_atk || 1) * atkMul),
      def: rawStat.ysbzs_def || 0,
      size: def.size || 'medium',
      quality: def.grade || '青铜',
      level: lv,
      tags: def.tags || [],
      slots: [],
      pos: pos,
      active: (faction === 'player'),
      dead: false,
      el: null,
      cost: def.cost || 2,
      gold: Math.round(def.cost * 0.5 + 1),
      ability: null,
    };

    // slots 从 enriched 数据构建
    if (lvlData && lvlData.slots) {
      instance.slots = lvlData.slots.map(function (s) {
        return {
          el: s.el, sn: s.sn, dir: s.dir, tier: s.tier,
          layers: s.layers || 1, value: s.value || 0,
          shape_sn: s.shape_sn, shape_name: s.shape_name, shape_cat: s.shape_cat,
          shape_id: s.shape_id, requires_full_fit: s.requires_full_fit,
          action_type: s.action_type,
          skill: s.skill || null,
          summonCount: s.summonCount || 0, summonHp: s.summonHp || 0,
          used: false,
        };
      });
    }

    return instance;
  }

  // ================================================================
  // 执行
  // ================================================================
  var extUnitDefs = buildExternalUnitDefs();
  var newShopPools = buildMergedShopPools();
  var newSD = buildNewSD();
  var enemyPools = buildEnemyPools();

  // 缓存原始 Pal 数据供工厂使用
  var palRaw = getPalUnits();
  if (palRaw) {
    var rawStats = {};
    (palRaw.pal_stats_ysbzs || []).forEach(function (s) { rawStats[s.unit_id] = s; });
    g.__EXTERNAL_PAL_STATS__ = rawStats;
  }
  g.__EXTERNAL_UNIT_DEFS__ = extUnitDefs;

  // UNIT_DEFS: 合并
  if (extUnitDefs && Object.keys(extUnitDefs).length >= 60) {
    g.__LEGACY_UNIT_DEFS__ = g.__LEGACY_UNIT_DEFS__ || (typeof UNIT_DEFS !== 'undefined' ? UNIT_DEFS : {});
    if (typeof UNIT_DEFS !== 'undefined') {
      var merged = {};
      Object.keys(extUnitDefs).forEach(function (k) { merged[k] = extUnitDefs[k]; });
      Object.keys(UNIT_DEFS).forEach(function (k) {
        if (!merged[k]) merged[k] = UNIT_DEFS[k];
      });
      UNIT_DEFS = merged;
    }
    g.__EXTERNAL_UNIT_COUNT__ = Object.keys(extUnitDefs).length;
  }

  // SHOP_POOLS
  if (newShopPools && Object.keys(newShopPools).length > 0) {
    g.__LEGACY_SHOP_POOLS__ = g.__LEGACY_SHOP_POOLS__ || (typeof SHOP_POOLS !== 'undefined' ? SHOP_POOLS : {});
    SHOP_POOLS = newShopPools;
    g.__EXTERNAL_SHOP_POOL_COUNT__ = Object.keys(newShopPools).length;
  }

  g.__NEW_SD__ = newSD;
  g.__EXTERNAL_SD_COUNT__ = newSD ? Object.keys(newSD).length : 0;

  // 注册 API
  g.createPalUnitInstance = createPalUnitInstance;
  g.getExternalUnitDefs = function () { return extUnitDefs; };
  g.getExternalSD = function () { return newSD; };
  g.getExternalEncounterWaves = function () {
    var enc = getEncounter();
    return enc ? (enc.encounter_wave || null) : null;
  };
  g.getExternalEnemyPools = function () { return enemyPools; };
  g.getExternalShopPools = function () { return newShopPools; };
  g.getExternalActionTemplate = getActionTpl;
  g.getExternalActionGrowth = getActionGrowth;
  g.getExternalPalUnits = getPalUnits;

  // 外部纯 Pal 商店池（不含旧 ID fallback）
  var externalOnlyPools = null;
  var sc = getShopConfig();
  if (sc && sc.shop_source) {
    var eByDay = {};
    sc.shop_source.forEach(function (s) {
      var day = s.unlock_day || 1;
      if (!eByDay[day]) eByDay[day] = [];
      eByDay[day].push(s.unit_id);
    });
    externalOnlyPools = {};
    Object.keys(eByDay).sort(function (a, b) { return parseInt(a) - parseInt(b); }).forEach(function (day) {
      var ids = eByDay[day];
      externalOnlyPools['day' + day + '_midday'] = ids.slice();
      externalOnlyPools['day' + day + '_night'] = ids.slice();
    });
  }
  g.__EXTERNAL_ONLY_POOLS__ = externalOnlyPools;
  g.getExternalOnlyShopPools = function () { return externalOnlyPools; };

  g.__EXTERNAL_DATA_LOADED__ = true;
})();
