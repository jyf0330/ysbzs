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
  function getHeroConfig()   { return loadJSON('hero_config.json'); }
  function getRelicConfig()  { return loadJSON('relic_config.json'); }
  function getEventConfig()  { return loadJSON('event_config.json'); }

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

    // 级联填充 day1~10：某天无专属池时继承之前所有已解锁 Pal
    var pools = {};
    var accumulated = [];
    for (var d = 1; d <= 10; d++) {
      if (byDay[d]) {
        byDay[d].forEach(function (id) {
          if (accumulated.indexOf(id) === -1) accumulated.push(id);
        });
      }
      pools['day' + d + '_midday'] = accumulated.slice();
      pools['day' + d + '_night']  = accumulated.slice();
    }

    // 旧 pool 合并（只保持 getShopPoolIds 兼容）
    var oldPools = (typeof SHOP_POOLS !== 'undefined' && Object.keys(SHOP_POOLS).length > 0) ? SHOP_POOLS : {};
    if (Object.keys(oldPools).length === 0) {
      var ld = getLegacyData();
      if (ld && ld.shop_pools && Object.keys(ld.shop_pools).length > 0) oldPools = ld.shop_pools;
    }
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
      // 按 (row, col) 排序 cells，保证兼容旧 atkCells 测试顺序
      var sortedCells = (item.cells || []).slice().sort(function (a, b) {
        return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
      });
      sd[sn] = {
        cells: sortedCells,
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
  // 确保全局变量存在（data.js 已不再定义这些）
  if (typeof UNIT_DEFS === 'undefined') UNIT_DEFS = {};
  if (typeof SHOP_POOLS === 'undefined') SHOP_POOLS = {};
  if (typeof SD === 'undefined') SD = {};
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

  // UNIT_DEFS: 合并（外部 Pal + legacy 旧单位）
  if (extUnitDefs && Object.keys(extUnitDefs).length >= 60) {
    g.__LEGACY_UNIT_DEFS__ = g.__LEGACY_UNIT_DEFS__ || (typeof UNIT_DEFS !== 'undefined' ? UNIT_DEFS : {});
    var merged = {};
    // 外部 60 Pal 优先
    Object.keys(extUnitDefs).forEach(function (k) { merged[k] = extUnitDefs[k]; });
    // legacy 旧单位补全
    var legacyData = getLegacyData();
    var legacyUD = legacyData.unit_defs || {};
    Object.keys(legacyUD).forEach(function (k) {
      if (!merged[k]) merged[k] = legacyUD[k];
    });
    // 已有 UNIT_DEFS（来自 data.js 或测试环境）补全
    if (typeof UNIT_DEFS !== 'undefined') {
      Object.keys(UNIT_DEFS).forEach(function (k) {
        if (!merged[k]) merged[k] = UNIT_DEFS[k];
      });
    }
    UNIT_DEFS = merged;
    g.__EXTERNAL_UNIT_COUNT__ = Object.keys(extUnitDefs).length;
  }

  // SHOP_POOLS
  if (newShopPools && Object.keys(newShopPools).length > 0) {
    g.__LEGACY_SHOP_POOLS__ = g.__LEGACY_SHOP_POOLS__ || (typeof SHOP_POOLS !== 'undefined' ? SHOP_POOLS : {});
    SHOP_POOLS = newShopPools;
    g.__EXTERNAL_SHOP_POOL_COUNT__ = Object.keys(newShopPools).length;
  }

  // 替换 SD 为新形状（旧 SD 通过 __LEGACY_SD__ 保留）
  if (newSD && Object.keys(newSD).length >= 22) {
    g.__LEGACY_SD__ = g.__LEGACY_SD__ || (typeof SD !== 'undefined' ? SD : {});
    SD = newSD;
  }
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
  g.getExternalHeroConfig = getHeroConfig;
  g.getExternalRelicConfig = getRelicConfig;
  g.getExternalEventConfig = getEventConfig;
  g.getExternalRoundConfig = function () { return loadJSON('round_config.json'); };

  // ── Legacy 兼容全局（旧测试/旧代码引用，主路径不应使用）─
  var legacyData = getLegacyData();
  if (typeof MONSTER_TYPES === 'undefined' && legacyData.monster_types) {
    MONSTER_TYPES = legacyData.monster_types;
  }
  if (typeof DAY_WAVE_CONFIG === 'undefined' && legacyData.day_wave_config) {
    DAY_WAVE_CONFIG = legacyData.day_wave_config;
  }
  if (typeof DAY_ROUND_CONFIG === 'undefined' && legacyData.day_round_config) {
    DAY_ROUND_CONFIG = legacyData.day_round_config;
  }
  if (typeof REWARD_NODE_CONFIG === 'undefined' && legacyData.reward_node_config) {
    REWARD_NODE_CONFIG = legacyData.reward_node_config;
  }
  if (typeof SHOP_PRICE_CONFIG === 'undefined' && legacyData.shop_price_config) {
    SHOP_PRICE_CONFIG = legacyData.shop_price_config;
  }
  if (typeof UNIT_TIER_POOL === 'undefined' && legacyData.unit_tier_pool) {
    UNIT_TIER_POOL = legacyData.unit_tier_pool;
  }
  g.getExternalBattleConfig = function () { return loadJSON('battle_config.json'); };
  g.getExternalGameConfig = function () { return loadJSON('game_config.json'); };

  // ── 运行时配置快捷读取 ──────────────────────────────────────

  /** 获取运行时容量配置 */
  g.getCapacityConfig = function () {
    var sc = getShopConfig();
    if (sc && sc.shop_runtime && sc.shop_runtime.capacity) {
      return sc.shop_runtime.capacity;
    }
    return { active_capacity: 10, backpack_capacity: 20, shop_capacity: 10 };
  };

  /** 获取商店经济配置（收入/利息/费用） */
  g.getShopEconomyConfig = function () {
    var sc = getShopConfig();
    if (sc && sc.shop_runtime && sc.shop_runtime.economy) {
      return sc.shop_runtime.economy;
    }
    return { night_income: {}, interest_step: 8, interest_max: 2, roll_cost: 1, freeze_cost: 0 };
  };

  /** 获取商店 tier 解锁配置 */
  g.getShopTierUnlock = function () {
    var sc = getShopConfig();
    if (sc && sc.shop_runtime && sc.shop_runtime.shop_tier_unlock) {
      return sc.shop_runtime.shop_tier_unlock;
    }
    return [{ day_from: 1, shop_tier: 1 }];
  };

  /** 获取 legacy 品质价格（仅 fallback 使用） */
  g.getLegacyPriceByQuality = function () {
    var sc = getShopConfig();
    if (sc && sc.shop_runtime && sc.shop_runtime.legacy_price_by_quality) {
      return sc.shop_runtime.legacy_price_by_quality;
    }
    return { '青铜': 2, '白银': 4, '黄金': 6, '钻石': 8 };
  };

  /** 获取 legacy 商店 slots（仅旧池 fallback 使用） */
  g.getLegacyShopSlots = function () {
    var sc = getShopConfig();
    if (sc && sc.shop_runtime && sc.shop_runtime.legacy_shop_slots) {
      return sc.shop_runtime.legacy_shop_slots;
    }
    return null;
  };

  /** 获取战斗配置（explosion_threshold 等） */
  g.getBattleConfig = function () {
    var bc = loadJSON('battle_config.json');
    if (bc && bc.combat) return bc.combat;
    return { explosion_threshold: 3 };
  };

  /** 获取爆炸阈值 */
  g.getExplosionThreshold = function () {
    var combat = g.getBattleConfig();
    return combat.explosion_threshold || 3;
  };

  /** 获取每日回合数配置 */
  g.getRoundConfig = function () {
    var rc = loadJSON('round_config.json');
    if (rc && rc.rounds) return rc.rounds;
    return null;
  };

  /** 获取指定天的回合数 */
  g.getRoundsForDay = function (day, phase) {
    var rounds = g.getRoundConfig();
    if (!rounds) return null;
    for (var i = 0; i < rounds.length; i++) {
      if (rounds[i].day === day) {
        return phase === 'afternoon' ? rounds[i].afternoon : rounds[i].morning;
      }
    }
    return null;
  };

  /** 获取 Boss 遭遇配置 */
  g.getBossEncounterConfig = function (day, phase) {
    var ec = getEncounter();
    if (ec && ec.boss_encounter) {
      for (var i = 0; i < ec.boss_encounter.length; i++) {
        var b = ec.boss_encounter[i];
        if (b.day === day && (b.phase === phase || !b.phase || b.phase === 'afternoon')) {
          return b;
        }
      }
    }
    return null;
  };

  // ── 新增配置读取 ──────────────────────────────────────────

  /** fallback 命中计数器，测试可检查 */
  g.__FALLBACK_HITS__ = {};

  function _fallbackWarn(name) {
    if (!g.__FALLBACK_HITS__) g.__FALLBACK_HITS__ = {};
    g.__FALLBACK_HITS__[name] = (g.__FALLBACK_HITS__[name] || 0) + 1;
  }

  /** 获取地形/陷阱配置 */
  g.getTerrainConfig = function () {
    var tc = loadJSON('terrain_config.json');
    if (tc && tc.terrain) return tc.terrain;
    _fallbackWarn('terrain_config');
    return {
      fire: { name: '火陷阱', damageType: 'fire', apDelta: 0, desc: '' },
      water: { name: '水陷阱', damageType: 'water', apDelta: 0, desc: '' },
      wind: { name: '风陷阱', damageType: 'wind', apDelta: -1, desc: '' },
      earth: { name: '土陷阱', damageType: 'earth', apDelta: -1, desc: '' },
    };
  };
  g.getTrapConfig = g.getTerrainConfig; // 别名

  /** 获取 tier_mult（仅 UI 显示） */
  g.getTierMult = function () {
    var bc = loadJSON('battle_config.json');
    if (bc && bc.legacy_ui_only && bc.legacy_ui_only.tier_mult) {
      return bc.legacy_ui_only.tier_mult;
    }
    _fallbackWarn('tier_mult');
    return [0, 1, 2, 4, 8];
  };

  /** 获取经验阈值常量 */
  g.getMaxStk = function () { return 6; };

  // ── Legacy 数据读取（仅极端容错/旧存档兼容）───────────────

  /** 读取 legacy_data.json */
  function getLegacyData() {
    return loadJSON('legacy_data.json') || {};
  }

  g.getLegacyUnitDefs = function () {
    var ld = getLegacyData();
    return ld.unit_defs || {};
  };
  g.getLegacyMonsterTypes = function () {
    var ld = getLegacyData();
    return ld.monster_types || {};
  };
  g.getLegacyDayWaveConfig = function () {
    var ld = getLegacyData();
    return ld.day_wave_config || {};
  };
  g.getLegacyShopPools = function () {
    var ld = getLegacyData();
    return ld.shop_pools || {};
  };
  g.getLegacyUnitTierPool = function () {
    var ld = getLegacyData();
    return ld.unit_tier_pool || {};
  };
  g.getLegacyRewardNodeConfig = function () {
    var ld = getLegacyData();
    return ld.reward_node_config || {};
  };
  g.getLegacyGradeBase = function () {
    var ld = getLegacyData();
    return ld.grade_base || { '青铜': 2, '白银': 4, '黄金': 6, '钻石': 8 };
  };

  /** 计算单位价格：优先外部 price，再 legacy_price_by_quality，最后 fallback 2 */
  g.calcUnitPrice = function (def) {
    if (def && def.price != null) return def.price;
    var lp = (typeof getLegacyPriceByQuality === 'function') ? getLegacyPriceByQuality() : {};
    if (def && def.grade && lp[def.grade] != null) return lp[def.grade];
    if (def && def.cost != null) return def.cost;
    _fallbackWarn('calcUnitPrice');
    return 2;
  };

  // 注册全局 calcUnitPrice
  g.calcUnitPrice = g.calcUnitPrice;
  if (typeof calcUnitPrice === 'undefined' || typeof calcUnitPrice !== 'function') {
    calcUnitPrice = function(def) { return g.calcUnitPrice(def); };
  }

  // 按 unlock_day 分组后，对 day1~10 级联填充：某天无专属池时继承之前所有已解锁 Pal
  var externalOnlyPools = null;
  var sc = getShopConfig();
  if (sc && sc.shop_source) {
    var eByDay = {};
    sc.shop_source.forEach(function (s) {
      var day = s.unlock_day || 1;
      if (!eByDay[day]) eByDay[day] = [];
      eByDay[day].push(s.unit_id);
    });
    // 构建 day1~10 的级联池：day N 继承所有 unlock_day <= N 的 ID
    externalOnlyPools = {};
    var accumulated = []; // 累积所有已解锁 Pal
    for (var d = 1; d <= 10; d++) {
      if (eByDay[d]) {
        eByDay[d].forEach(function (id) {
          if (accumulated.indexOf(id) === -1) accumulated.push(id);
        });
      }
      externalOnlyPools['day' + d + '_midday'] = accumulated.slice();
      externalOnlyPools['day' + d + '_night'] = accumulated.slice();
    }
  }
  g.__EXTERNAL_ONLY_POOLS__ = externalOnlyPools;
  g.getExternalOnlyShopPools = function () { return externalOnlyPools; };

  g.__EXTERNAL_DATA_LOADED__ = true;
})();
