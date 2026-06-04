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
  var ROOT = g.__YSBZS_ROOT__ || ((typeof __dirname !== 'undefined') ? __dirname : '.');

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
  // 6. Bazaar-like schema 读取与运行时适配
  // ================================================================
  function getBazaarLikeTable(name) {
    return loadJSON('bazaar-like-schema/' + name + '.json');
  }

  function tierNumToName(n) {
    return ({1:'bronze',2:'silver',3:'gold',4:'diamond'}[n] || 'bronze');
  }
  function tierNameToNum(t) {
    return ({bronze:1,silver:2,gold:3,diamond:4,legendary:5,'青铜':1,'白银':2,'黄金':3,'钻石':4}[t] || 1);
  }
  function normalizeTagSet(def) {
    var set = {};
    function add(x) { if (x !== undefined && x !== null && x !== '') set[String(x)] = true; }
    function addMany(xs) { (xs || []).forEach(add); }
    add('pal'); add('common');
    add(def.size || 'medium');
    add(def.element || 'wind');
    addMany(def.tags || []);
    var raw = Object.keys(set);
    raw.forEach(function (t) {
      var m = {
        '火':'fire','水':'water','风':'wind','土':'earth',
        '召唤':'summon','陷阱':'trap','护盾':'shield','防御':'shield','阻挡':'shield',
        '治疗':'heal','回复':'heal','续航':'heal',
        '爆发':'burst','输出':'burst','引爆':'burst',
        '控制':'control','牵制':'control','机动':'control','侧击':'ranged','远程':'ranged','后排':'ranged',
        '近战':'melee','前排':'melee','单点':'melee',
        '小型':'small','中型':'medium','大型':'large'
      }[t];
      if (m) set[m] = true;
    });
    if (def.element === 'fire') set.fire = true;
    if (def.element === 'water') set.water = true;
    if (def.element === 'wind') set.wind = true;
    if (def.element === 'earth') set.earth = true;
    return set;
  }

  function buildBazaarRuntimeCards() {
    var defs = g.__EXTERNAL_UNIT_DEFS__ || extUnitDefs || {};
    var cards = [];
    Object.keys(defs).forEach(function (id) {
      if (id.indexOf('pal_') !== 0) return;
      var def = defs[id];
      var tierNum = def.tier || def.priceTier || tierNameToNum(def.grade);
      var tagSet = normalizeTagSet(def);
      cards.push({
        id: id,
        card_id: id,
        unitId: id,
        defId: id,
        name: def.name || id,
        category: 'pal',
        hero_scope: 'common',
        tier: tierNumToName(tierNum),
        tierNum: tierNum,
        size: def.size || 'medium',
        slot_size: def.slotSize || 1,
        base_price: def.cost || def.price || 2,
        tags: Object.keys(tagSet),
        _tagSet: tagSet,
        enabled: true,
        source_table: 'runtime_external_unit_defs'
      });
    });
    return cards;
  }

  function getBazaarDayNode(day) {
    var sch = getBazaarLikeTable('encounter_schedule');
    if (!sch || !sch.days) return null;
    for (var i = 0; i < sch.days.length; i++) {
      if (sch.days[i].day === day) return sch.days[i];
    }
    return null;
  }

  function getMerchantById(id) {
    var mm = getBazaarLikeTable('merchant_master');
    var arr = (mm && mm.merchants) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].merchant_id === id) return arr[i];
    return null;
  }
  function getMerchantRuleById(id) {
    var mr = getBazaarLikeTable('merchant_rule');
    var arr = (mr && mr.merchant_rules) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].merchant_id === id) return arr[i];
    return null;
  }
  function getRerollRuleById(id) {
    var rr = getBazaarLikeTable('merchant_reroll_rule');
    var arr = (rr && rr.merchant_reroll_rules) || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].merchant_id === id) return arr[i];
    return null;
  }

  function selectBazaarMerchant(day, dayHalf) {
    var mm = getBazaarLikeTable('merchant_master');
    var merchants = (mm && mm.merchants) || [];
    if (!merchants.length) return null;
    var wanted = [];
    var node = getBazaarDayNode(day);
    var hourIndex = (dayHalf >= 2) ? 2 : 0;
    if (node && node.hours) {
      for (var hi = 0; hi < node.hours.length; hi++) {
        var h = node.hours[hi];
        if (h.hour !== hourIndex || !h.options) continue;
        h.options.forEach(function (op) {
          if (op.type === 'merchant') wanted = wanted.concat(op.pool || []);
        });
      }
    }
    var eligible = merchants.filter(function (m) {
      var d = day || 1;
      return m.enabled !== false && (m.min_day || 1) <= d && d <= (m.max_day || 10);
    });
    if (wanted.length) {
      var byWanted = eligible.filter(function (m) { return wanted.indexOf(m.merchant_id) >= 0; });
      if (byWanted.length) eligible = byWanted;
    }
    if (!eligible.length) return null;
    var shopTier = (day >= 7) ? 4 : (day >= 5) ? 3 : (day >= 3) ? 2 : 1;
    eligible.sort(function (a, b) {
      var da = Math.abs((a.poolTier || tierNameToNum(a.tier)) - shopTier);
      var db = Math.abs((b.poolTier || tierNameToNum(b.tier)) - shopTier);
      if (da !== db) return da - db;
      return (b.weight || 0) - (a.weight || 0);
    });
    return eligible[0];
  }

  function cardMatchesPoolRule(card, rule, day, heroId) {
    if (!rule) return true;
    if ((rule.min_day || 1) > day || day > (rule.max_day || 10)) return false;
    if (rule.include_categories && rule.include_categories.length && rule.include_categories.indexOf(card.category) < 0) return false;
    if (rule.include_tiers && rule.include_tiers.length && rule.include_tiers.indexOf(card.tier) < 0) return false;
    if (rule.include_sizes && rule.include_sizes.length && rule.include_sizes.indexOf(card.size) < 0) return false;
    var tagSet = card._tagSet || {};
    if (rule.exclude_tags && rule.exclude_tags.some(function (t) { return tagSet[t]; })) return false;
    if (rule.include_tags && rule.include_tags.length) {
      var any = rule.include_tags.some(function (t) { return tagSet[t]; });
      if (!any) return false;
    }
    if (rule.include_elements && rule.include_elements.length) {
      var anyEl = rule.include_elements.some(function (t) { return tagSet[t]; });
      if (!anyEl) return false;
    }
    if (rule.include_hero_scope && rule.include_hero_scope.length) {
      var scopes = rule.include_hero_scope.slice();
      if (heroId) scopes.push(heroId);
      if (scopes.indexOf('current_hero') >= 0 || scopes.indexOf('common') >= 0) return true;
      return scopes.indexOf(card.hero_scope) >= 0;
    }
    return true;
  }

  function getBazaarPrice(card) {
    var eco = getBazaarLikeTable('economy_rule');
    if (card && card.base_price != null) return card.base_price;
    var t = (card && card.tierNum) || 1;
    var fallback = eco && eco.buy_price && eco.buy_price.fallback_by_poolTier;
    return (fallback && fallback[t]) || ({1:2,2:4,3:6,4:8}[t] || 2);
  }

  function rollBazaarLikeShopOffers(ctx) {
    ctx = ctx || {};
    var day = ctx.day || (g.G && g.G.day) || 1;
    var dayHalf = ctx.dayHalf || (g.G && g.G.dayHalf) || 1;
    var heroId = ctx.heroId || (g.G && g.G.heroInfo && g.G.heroInfo.id) || '';
    var merchant = ctx.merchant || selectBazaarMerchant(day, dayHalf);
    if (!merchant) return null;
    var rule = getMerchantRuleById(merchant.merchant_id) || { offer_count: 5 };
    var poolRules = ((getBazaarLikeTable('merchant_pool_rule') || {}).merchant_pool_rules || []).filter(function (r) {
      return r.merchant_id === merchant.merchant_id && (r.min_day || 1) <= day && day <= (r.max_day || 10);
    });
    var cards = buildBazaarRuntimeCards();
    var candidates = [];
    poolRules.forEach(function (pr) {
      cards.forEach(function (c) {
        if (cardMatchesPoolRule(c, pr, day, heroId) && candidates.indexOf(c) < 0) candidates.push(c);
      });
    });
    if (!candidates.length) {
      candidates = cards.filter(function (c) { return c.tierNum <= ((day >= 7) ? 4 : (day >= 5) ? 3 : (day >= 3) ? 2 : 1); });
    }
    candidates.sort(function (a, b) {
      if (a.tierNum !== b.tierNum) return a.tierNum - b.tierNum;
      return a.id.localeCompare(b.id);
    });
    var offerCount = rule.offer_count || 5;
    var start = ((g.G && g.G.nextUnitId) || 0) % Math.max(1, candidates.length);
    var offers = [];
    var used = {};
    for (var i = 0; i < candidates.length && offers.length < offerCount; i++) {
      var card = candidates[(start + i) % candidates.length];
      if (!card || used[card.id]) continue;
      used[card.id] = true;
      offers.push({
        id: 'bz_' + day + '_' + (g.G ? g.G.nextUnitId : 0) + '_' + offers.length,
        itemType: 'pal',
        unitId: card.unitId,
        defId: card.defId,
        name: card.name,
        size: card.size,
        slotSize: card.slot_size || 1,
        quality: ({bronze:'青铜',silver:'白银',gold:'黄金',diamond:'钻石'}[card.tier] || '青铜'),
        price: getBazaarPrice(card),
        cost: getBazaarPrice(card),
        tags: card.tags || [],
        frozen: false,
        schemaSource: 'bazaar-like-schema',
        merchantId: merchant.merchant_id,
        merchantName: merchant.name
      });
    }
    return { merchant: merchant, rule: rule, offers: offers };
  }

  function getBazaarLikeEconomyCompat() {
    var eco = getBazaarLikeTable('economy_rule');
    if (!eco) return null;
    return {
      night_income: (eco.daily_income && eco.daily_income.table) || {},
      interest_step: eco.interest ? eco.interest.threshold : 8,
      interest_max: eco.interest ? eco.interest.max_interest : 2,
      roll_cost: (eco.reroll_cost && eco.reroll_cost.default_by_poolTier && eco.reroll_cost.default_by_poolTier[1]) || 1,
      economy_rule: eco
    };
  }

  function getBazaarLikeCapacityCompat() {
    var eco = getBazaarLikeTable('economy_rule');
    if (!eco || !eco.capacity) return null;
    return {
      active_capacity: eco.capacity.active ? eco.capacity.active.start : 10,
      backpack_capacity: eco.capacity.backpack ? eco.capacity.backpack.start : 20,
      shop_capacity: eco.capacity.shop ? eco.capacity.shop.start : 10
    };
  }

  function writeStructuredLog(logKey, data, fallbackText) {
    data = data || {};
    var state = (typeof G !== 'undefined') ? G : g.G;
    var type = (logKey || 'LOG').toUpperCase();
    var entry = {
      type: type,
      logKey: logKey,
      day: state ? state.day : undefined,
      phase: state ? state.phase : undefined,
      data: data,
      desc: fallbackText || logKey
    };
    if (state) {
      if (!Array.isArray(state.actionLog)) state.actionLog = [];
      state.actionLog.push(entry);
    }
    if (fallbackText && typeof glog === 'function') glog(fallbackText);
    return entry;
  }



  // ================================================================
  // 7. Bazaar-like v3 完整运行闭环：奖励/等级/词缀/效果/PvE/AI
  // ================================================================
  function bzState() {
    return (typeof G !== 'undefined') ? G : g.G;
  }

  function bzClone(obj) {
    return JSON.parse(JSON.stringify(obj || {}));
  }

  function bzGoldText(delta) {
    return (delta >= 0 ? '+' : '') + delta + ' 金币';
  }

  function getBazaarCardMasterCards() {
    var cm = getBazaarLikeTable('card_master');
    return (cm && cm.cards) || [];
  }

  function getBazaarCardById(cardId) {
    var cards = getBazaarCardMasterCards();
    for (var i = 0; i < cards.length; i++) if (cards[i].id === cardId || cards[i].card_id === cardId) return cards[i];
    var runtime = buildBazaarRuntimeCards();
    for (var j = 0; j < runtime.length; j++) if (runtime[j].id === cardId || runtime[j].unitId === cardId || runtime[j].defId === cardId) return runtime[j];
    return null;
  }

  function bzTagsFromCard(card) {
    var set = {};
    (card && card.tags || []).forEach(function(t){ set[String(t)] = true; });
    return set;
  }

  function bzTagsFromUnit(unit) {
    var def = unit && (g.UNIT_DEFS || UNIT_DEFS || {})[unit.defId || unit.unitId];
    return def ? normalizeTagSet(def) : {};
  }

  function getBazaarRewardPool(poolId) {
    var pools = [];
    var rt = getBazaarLikeTable('reward_table');
    var lr = getBazaarLikeTable('level_reward_table');
    if (rt && rt.reward_pools) pools = pools.concat(rt.reward_pools);
    if (lr && lr.reward_pools) pools = pools.concat(lr.reward_pools);
    for (var i = 0; i < pools.length; i++) if (pools[i].reward_pool_id === poolId) return pools[i];
    return null;
  }

  function bzEvalAmountFormula(formula, ctx) {
    ctx = ctx || {};
    if (formula == null) return 0;
    if (typeof formula === 'number') return formula;
    var day = Number(ctx.day || (bzState() && bzState().day) || 1);
    var expr = String(formula).replace(/floor\s*\(/g, 'Math.floor(').replace(/day/g, String(day));
    try { return Math.round(Function('Math', 'return (' + expr + ');')(Math)); }
    catch (e) { return 0; }
  }

  function normalizeBazaarReward(raw) {
    raw = raw || {};
    var params = bzClone(raw.params || {});
    Object.keys(raw).forEach(function(k){
      if (['type','reward_type','reward_id','weight','params'].indexOf(k) < 0 && params[k] === undefined) params[k] = raw[k];
    });
    return {
      reward_id: raw.reward_id || raw.type || raw.reward_type,
      reward_type: raw.reward_type || raw.type,
      type: raw.reward_type || raw.type,
      weight: raw.weight || 0,
      params: params,
      reward_pool_id: raw.reward_pool_id || params.reward_pool_id,
      amount: raw.amount != null ? raw.amount : params.amount,
      amount_formula: raw.amount_formula || params.amount_formula,
      card_id: raw.card_id || params.card_id
    };
  }

  function getBazaarRewardList(poolId) {
    var pool = getBazaarRewardPool(poolId);
    if (!pool || !pool.rewards) return [];
    var rewards = pool.rewards.map(normalizeBazaarReward);
    var n = pool.choose_count || rewards.length;
    if (n < rewards.length) {
      rewards.sort(function(a,b){ return (b.weight || 0) - (a.weight || 0); });
      rewards = rewards.slice(0, n);
    }
    return rewards;
  }

  function bzGainGold(amount, ctx) {
    var state = bzState(); if (!state) return 0;
    amount = Number(amount || 0);
    state.gold = (state.gold || 0) + amount;
    writeStructuredLog(ctx && ctx.logKey || 'gain_gold', { amount: amount, gold_after: state.gold, source: ctx && ctx.source }, '💰 ' + (ctx && ctx.label || '奖励') + '：' + bzGoldText(amount));
    return amount;
  }

  function bzGetCardName(cardId) {
    var card = getBazaarCardById(cardId);
    return (card && card.name) || cardId;
  }

  function bzCreatePal(unitId, quality, targetZone) {
    var state = bzState(); if (!state || !unitId) return null;
    var unit = null;
    if (typeof createPalUnitInstance === 'function') unit = createPalUnitInstance({ unitId: unitId, faction: 'player', quality: quality || '青铜' });
    if (!unit && typeof addOwnedUnit === 'function') unit = addOwnedUnit(unitId, null);
    if (!unit) return null;
    if (!unit.instanceId) unit.instanceId = 'u_' + (state.nextUnitId++);
    unit.palLevel = unit.palLevel || 1;
    unit.affixes = unit.affixes || [];
    if (!state.ownedUnits.some(function(u){ return u.instanceId === unit.instanceId; })) state.ownedUnits.push(unit);
    if (targetZone === 'backpack') unit.active = false;
    if (typeof bazaarApplyPalLevelStats === 'function') bazaarApplyPalLevelStats(unit, { silent: true });
    if (typeof syncUnitsToHeroes === 'function') syncUnitsToHeroes();
    return unit;
  }

  function bzGainCard(cardId, ctx) {
    var state = bzState(); if (!state || !cardId) return null;
    var card = getBazaarCardById(cardId);
    var category = (card && card.category) || (String(cardId).indexOf('relic_') === 0 ? 'relic' : 'pal');
    if (category === 'relic') {
      if (typeof gainRelic === 'function') gainRelic(cardId, (card && card.name) || cardId);
      writeStructuredLog('gain_card', { category: 'relic', card_id: cardId, source: ctx && ctx.source }, '🎁 获得遗物：' + ((card && card.name) || cardId));
      return { category: 'relic', id: cardId };
    }
    if (category === 'affix') return bazaarGrantAffix(cardId, null, ctx);
    var unit = bzCreatePal((card && (card.unitId || card.defId)) || cardId, (card && card.tier) || '青铜', ctx && ctx.target_zone);
    writeStructuredLog('gain_card', { category: 'pal', card_id: cardId, unit_id: unit && unit.defId, source: ctx && ctx.source }, '🎁 获得宠物：' + ((unit && unit.name) || (card && card.name) || cardId));
    return unit;
  }

  function bzFindCardByFilter(params) {
    params = params || {};
    var cards = [];
    if (!params.category || params.category === 'pal') cards = cards.concat(buildBazaarRuntimeCards());
    getBazaarCardMasterCards().forEach(function(c){
      if (cards.some(function(x){ return x.id === c.id; })) return;
      cards.push(Object.assign({}, c, {_tagSet: bzTagsFromCard(c), tierNum: tierNameToNum(c.tier)}));
    });
    return cards.find(function(c){
      if (params.category && c.category !== params.category) return false;
      if (params.tiers && params.tiers.length && params.tiers.indexOf(c.tier) < 0) return false;
      var tagSet = c._tagSet || bzTagsFromCard(c);
      if (params.required_tags_any && params.required_tags_any.length && !params.required_tags_any.some(function(t){ return tagSet[t]; })) return false;
      return c.enabled !== false;
    }) || null;
  }

  function bzGainCardByFilter(params, ctx) {
    var card = bzFindCardByFilter(params || {});
    if (!card) return null;
    return bzGainCard(card.id || card.card_id || card.unitId, ctx);
  }

  function bazaarGetEffectiveUnitLevelData(unit, def) {
    if (!def) return null;
    var qualityLevel = Math.max(1, Math.min(4, unit && unit.level || 1));
    var base = bzClone((def.levels && def.levels[qualityLevel]) || (def.levels && def.levels[1]) || {});
    if (!base.slots && def.levels && def.levels[1]) base.slots = bzClone(def.levels[1].slots || []);
    var pr = getBazaarLikeTable('pal_level_rule');
    var globalLevels = pr && pr.pal_level_rules && pr.pal_level_rules.global && pr.pal_level_rules.global.levels;
    var palLevel = Math.max(1, Math.min((pr && pr.pal_level_rules && pr.pal_level_rules.global && pr.pal_level_rules.global.max_level) || 3, unit && unit.palLevel || 1));
    var levelCfg = (globalLevels || []).find(function(l){ return l.level === palLevel; }) || {};
    var hpMult = levelCfg.hp_mult || 1;
    var layerBonus = levelCfg.layer_bonus || 0;
    var slotValueBonus = levelCfg.slot_value_bonus || 0;
    base.hp = Math.max(1, Math.round((base.hp || unit && unit.maxHp || 10) * hpMult));
    base.slots = (base.slots || []).map(function(s){
      var ns = bzClone(s);
      ns.layers = Math.max(1, (ns.layers || 1) + layerBonus + ((unit && unit._palLayerBonus) || 0));
      ns.value = (ns.value || 0) + slotValueBonus + ((unit && unit._palSlotValueBonus) || 0);
      return ns;
    });
    return base;
  }

  function bazaarApplyPalLevelStats(unit, opts) {
    var state = bzState(); if (!unit) return unit;
    var def = (g.UNIT_DEFS || UNIT_DEFS || {})[unit.defId || unit.unitId];
    if (!def) return unit;
    unit.palLevel = unit.palLevel || 1;
    unit.affixes = unit.affixes || [];
    var oldMax = unit.maxHp || unit.hp || 1;
    var data = bazaarGetEffectiveUnitLevelData(unit, def);
    if (data && data.hp) {
      unit.maxHp = data.hp + (unit._palHpBonus || 0);
      unit.hp = Math.min(unit.maxHp, (unit.hp || oldMax) + Math.max(0, unit.maxHp - oldMax));
    }
    if (!opts || !opts.silent) writeStructuredLog('pal_level_up', { unit_id: unit.defId || unit.unitId, pal_level: unit.palLevel, maxHp: unit.maxHp }, '⬆️ ' + (unit.name || def.name || unit.defId) + ' 宠物等级 Lv' + unit.palLevel);
    return unit;
  }

  function bazaarLevelUpPal(unit, ctx) {
    var pr = getBazaarLikeTable('pal_level_rule');
    var maxLv = pr && pr.pal_level_rules && pr.pal_level_rules.global && pr.pal_level_rules.global.max_level || 3;
    var state = bzState();
    unit = unit || (state && state.ownedUnits && state.ownedUnits[0]);
    if (!unit) return null;
    var old = unit.palLevel || 1;
    unit.palLevel = Math.min(maxLv, old + 1);
    bazaarApplyPalLevelStats(unit, { silent: true });
    writeStructuredLog('pal_level_up', { unit_id: unit.defId || unit.unitId, before: old, after: unit.palLevel, source: ctx && ctx.source }, '⬆️ ' + (unit.name || unit.defId) + ' 宠物等级 ' + old + '→' + unit.palLevel);
    return unit;
  }

  function bzUpgradeUnitQuality(unit, maxTier, ctx) {
    var state = bzState(); if (!unit) return null;
    var max = tierNameToNum(maxTier || 'diamond');
    var old = unit.level || 1;
    unit.level = Math.min(max, old + 1);
    var def = (g.UNIT_DEFS || UNIT_DEFS || {})[unit.defId || unit.unitId];
    var data = bazaarGetEffectiveUnitLevelData(unit, def);
    if (data && data.hp) { unit.maxHp = data.hp + (unit._palHpBonus || 0); unit.hp = Math.min(unit.maxHp, (unit.hp || 1) + Math.max(0, unit.maxHp - ((def.levels && def.levels[old] && def.levels[old].hp) || unit.hp || 1))); }
    writeStructuredLog('pal_merge', { unit_id: unit.defId || unit.unitId, before: old, after: unit.level, source: ctx && ctx.source }, '⬆️ ' + (unit.name || (def && def.name) || unit.defId) + ' 品质 ' + old + '→' + unit.level);
    if (typeof syncUnitsToHeroes === 'function') syncUnitsToHeroes();
    return unit;
  }

  function bzUpgradeRandomPal(maxTier, ctx) {
    var state = bzState(); if (!state || !state.ownedUnits || !state.ownedUnits.length) return null;
    return bzUpgradeUnitQuality(state.ownedUnits[0], maxTier || 'diamond', ctx);
  }

  function bzUpgradeByTag(tag, maxTier, ctx) {
    var state = bzState(); if (!state || !state.ownedUnits) return null;
    var unit = state.ownedUnits.find(function(u){ var set = bzTagsFromUnit(u); return set[tag]; }) || state.ownedUnits[0];
    return bzUpgradeUnitQuality(unit, maxTier || 'diamond', ctx);
  }

  function bazaarGrantAffix(affixId, targetUnit, ctx) {
    var state = bzState(); if (!state) return null;
    var ar = getBazaarLikeTable('affix_rule');
    var affixes = (ar && ar.affixes) || [];
    var affix = affixes.find(function(a){ return a.affix_id === affixId; }) || affixes[0];
    if (!affix) return null;
    targetUnit = targetUnit || (state.ownedUnits || []).find(function(u){ return !(u.affixes && u.affixes.length); }) || (state.ownedUnits || [])[0];
    if (!targetUnit) return null;
    targetUnit.affixes = targetUnit.affixes || [];
    var max = (ar.affix_config && ar.affix_config.max_affix_per_card) || 1;
    if (targetUnit.affixes.length >= max) targetUnit.affixes[0] = affix.affix_id;
    else targetUnit.affixes.push(affix.affix_id);
    writeStructuredLog('affix_gain', { affix_id: affix.affix_id, unit_id: targetUnit.defId || targetUnit.unitId, source: ctx && ctx.source }, '✨ ' + (targetUnit.name || targetUnit.defId) + ' 获得印记：' + affix.name);
    return affix;
  }

  function bzApplyModifySelectedPal(params, ctx) {
    var state = bzState(); if (!state || !state.ownedUnits || !state.ownedUnits.length) return null;
    var unit = (ctx && ctx.targetUnit) || state.ownedUnits[0];
    params = params || {};
    if (params.hp_delta) { unit._palHpBonus = (unit._palHpBonus || 0) + params.hp_delta; unit.maxHp = (unit.maxHp || unit.hp || 1) + params.hp_delta; unit.hp = (unit.hp || 1) + params.hp_delta; }
    if (params.atk_delta) unit.atk = (unit.atk || 0) + params.atk_delta;
    if (params.layer_delta) unit._palLayerBonus = (unit._palLayerBonus || 0) + params.layer_delta;
    if (params.slot_value_bonus) unit._palSlotValueBonus = (unit._palSlotValueBonus || 0) + params.slot_value_bonus;
    bazaarLevelUpPal(unit, Object.assign({}, ctx || {}, {source: 'modify_selected_pal'}));
    writeStructuredLog('modify_selected_pal', { unit_id: unit.defId || unit.unitId, params: params }, '🎁 宠物训练完成：' + (unit.name || unit.defId));
    if (typeof syncUnitsToHeroes === 'function') syncUnitsToHeroes();
    return unit;
  }

  function bazaarResolveReward(raw, ctx) {
    var r = normalizeBazaarReward(raw);
    ctx = ctx || {};
    var params = r.params || {};
    switch (r.reward_type) {
      case 'gain_gold': return bzGainGold(r.amount != null ? r.amount : (params.amount != null ? params.amount : bzEvalAmountFormula(r.amount_formula || params.amount_formula, ctx)), Object.assign({logKey:'gain_gold'}, ctx));
      case 'gain_hero_xp': return (typeof heroAddXp === 'function') ? heroAddXp(params.amount || r.amount || 1, ctx.source || 'reward') : null;
      case 'gain_card': return bzGainCard(r.card_id || params.card_id, ctx);
      case 'gain_card_by_filter': return bzGainCardByFilter(params, ctx);
      case 'reward_pool': return bazaarResolveRewardPool(r.reward_pool_id || params.reward_pool_id, ctx);
      case 'capacity_up':
        var state = bzState(); if (!state) return null;
        state._capacityBonus = state._capacityBonus || {};
        state._capacityBonus[params.target || 'backpack'] = (state._capacityBonus[params.target || 'backpack'] || 0) + (params.amount || r.amount || 1);
        writeStructuredLog('capacity_up', { target: params.target || 'backpack', amount: params.amount || r.amount || 1, source: ctx.source }, '🎒 容量提升：' + (params.target || 'backpack') + ' +' + (params.amount || r.amount || 1));
        return state._capacityBonus;
      case 'modify_selected_pal': return bzApplyModifySelectedPal(params, ctx);
      case 'upgrade_by_tag': return bzUpgradeByTag(params.required_tag || raw.required_tag || 'fire', params.max_tier || raw.max_tier || 'diamond', ctx);
      case 'upgrade_random_pal': return bzUpgradeRandomPal(params.max_tier || raw.max_tier || 'diamond', ctx);
      case 'upgrade_selected_pal': return bzUpgradeUnitQuality(ctx.targetUnit || (bzState().ownedUnits || [])[0], params.max_tier || 'diamond', ctx);
      case 'starting_kit':
        (params.pals || []).forEach(function(id){ bzGainCard(id, Object.assign({source:'starting_kit'}, ctx)); });
        (params.relics || []).forEach(function(id){ bzGainCard(id, Object.assign({source:'starting_kit'}, ctx)); });
        return true;
      case 'add_run_modifier':
        var st = bzState(); if (st) { st.runModifiers = st.runModifiers || []; st.runModifiers.push(params.modifier_id || r.reward_id); }
        writeStructuredLog('add_run_modifier', { modifier_id: params.modifier_id || r.reward_id }, '🔓 获得局内修正：' + (params.modifier_id || r.reward_id));
        return true;
      case 'gain_affix': return bazaarGrantAffix(params.affix_id || raw.affix_id, ctx.targetUnit, ctx);
      default:
        writeStructuredLog('reward_unknown', { reward_type: r.reward_type, reward: r }, '🎁 奖励：' + (r.reward_type || '未知'));
        return null;
    }
  }

  function bazaarResolveRewardPool(poolId, ctx) {
    var rewards = getBazaarRewardList(poolId);
    var results = [];
    rewards.forEach(function(r){ results.push(bazaarResolveReward(r, Object.assign({reward_pool_id: poolId}, ctx || {}))); });
    return results;
  }

  function getBazaarHeroLevelRuntime(heroId) {
    var hl = getBazaarLikeTable('hero_level_rule');
    var arr = (hl && hl.hero_level_rules) || [];
    return arr.find(function(r){ return r.hero_id === heroId; }) || arr[0] || null;
  }

  function bazaarApplyHeroLevelReward(level, ctx) {
    var state = bzState(); if (!state || !state.heroInfo) return null;
    var rule = getBazaarHeroLevelRuntime(state.heroInfo.id);
    if (!rule || !rule.levels) return null;
    var lv = rule.levels.find(function(x){ return x.level === level; });
    if (!lv || !lv.reward_pool_id) return null;
    writeStructuredLog('hero_level_up', { hero_id: state.heroInfo.id, level: level, reward_pool_id: lv.reward_pool_id }, '⬆️ ' + (state.heroInfo.name || '英雄') + ' 升到 Lv' + level + '，发放升级奖励');
    return bazaarResolveRewardPool(lv.reward_pool_id, Object.assign({source:'hero_level', logKey:'hero_level_up'}, ctx || {}));
  }

  function bazaarAddHeroXp(amount, source) {
    var state = bzState(); if (!state) return null;
    state.heroInfo = state.heroInfo || { id:'ember_tamer', name:'火种驯宠师', level:1, xp:0 };
    var rule = getBazaarHeroLevelRuntime(state.heroInfo.id);
    amount = Number(amount || 1);
    state.heroInfo.xp = (state.heroInfo.xp || 0) + amount;
    writeStructuredLog('hero_xp_gain', { amount: amount, xp_after: state.heroInfo.xp, source: source }, '⭐ 英雄经验 +' + amount + '（当前 ' + state.heroInfo.xp + '）');
    if (rule && rule.levels) {
      var current = state.heroInfo.level || 1;
      rule.levels.forEach(function(lv){
        if (lv.level > current && state.heroInfo.xp >= (lv.xp_required_total || 0)) {
          state.heroInfo.level = lv.level;
          bazaarRunTrigger('on_hero_level_up', { level: lv.level, hero: state.heroInfo, source: source });
          bazaarApplyHeroLevelReward(lv.level, {source: source});
        }
      });
    }
    if (typeof onCoreStateChange === 'function') onCoreStateChange();
    return state.heroInfo;
  }

  function bazaarResolvePveReward(encounterType, ctx) {
    var pr = getBazaarLikeTable('pve_reward_rule');
    var arr = (pr && pr.pve_reward_rules) || [];
    ctx = ctx || {};
    var day = ctx.day || (bzState() && bzState().day) || 1;
    var rule = arr.find(function(r){ return r.encounter_type === encounterType; }) || arr.find(function(r){ return r.encounter_type === 'battle'; });
    if (!rule) return [];
    var rewards = (rule.default_rewards || []).slice();
    (rule.bonus_by_day || []).forEach(function(b){ if ((b.min_day || 1) <= day) rewards = rewards.concat(b.rewards || []); });
    if (rule.guaranteed_choices && rule.guaranteed_choices.choices && rule.guaranteed_choices.choices.length) {
      rewards.push(rule.guaranteed_choices.choices[0]);
    }
    var results = [];
    rewards.forEach(function(raw){
      if (raw.chance && raw.chance < 100) {
        // 可重复、确定性：按 day 取模，避免测试随机 flaky。
        if (((day * 37) % 100) >= raw.chance) return;
      }
      results.push(bazaarResolveReward(raw, Object.assign({source: encounterType + '_reward', day: day, logKey: encounterType + '_win_reward'}, ctx)));
    });
    writeStructuredLog(encounterType === 'boss' ? 'boss_win_reward' : 'battle_win_reward', { encounter_type: encounterType, reward_count: results.length, day: day }, (encounterType === 'boss' ? '👑 Boss奖励已结算' : '🎁 战斗奖励已结算'));
    return results;
  }

  function bazaarResolveType(effect, ctx) {
    effect = effect || {}; ctx = ctx || {};
    var params = effect.params || {};
    switch (effect.type) {
      case 'gain_gold': return bzGainGold(params.amount || 1, {source: effect.effect_id, logKey: effect.log_key || 'effect_gain_gold'});
      case 'add_element_layers':
        var cells = ctx.cells || ctx.source_cells || (ctx.pos ? [ctx.pos] : []);
        var el = params.element === 'same_as_source' ? (ctx.element || ctx.el || 'fire') : (params.element || ctx.element || 'fire');
        cells.forEach(function(pos){ if (typeof addElementLayers === 'function') addElementLayers(pos, el, params.layers || 1); });
        writeStructuredLog(effect.log_key || 'affix_trigger', { effect_id: effect.effect_id, element: el, cells: cells }, '✨ 触发效果：' + (effect.name || effect.effect_id));
        return true;
      case 'add_trap_layers':
        var tcells = ctx.cells || ctx.source_cells || (ctx.pos ? [ctx.pos] : []);
        var tel = params.element === 'same_as_source' ? (ctx.element || ctx.el || 'earth') : (params.element || ctx.element || 'earth');
        tcells.forEach(function(pos){ if (typeof addTrapLayers === 'function') addTrapLayers(pos, tel, params.layers || 1); });
        writeStructuredLog(effect.log_key || 'affix_trigger', { effect_id: effect.effect_id, element: tel, cells: tcells }, '✨ 触发陷阱效果：' + (effect.name || effect.effect_id));
        return true;
      case 'heal':
        var state = bzState(); if (!state) return null;
        var allies = (state.ownedUnits || []).filter(function(u){ return u.active !== false && u.hp < u.maxHp; }).sort(function(a,b){ return (a.hp/a.maxHp)-(b.hp/b.maxHp); });
        var target = allies[0] || (state.ownedUnits || [])[0];
        if (target) { var old = target.hp || 0; target.hp = Math.min(target.maxHp || old, old + (params.amount || 1)); writeStructuredLog(effect.log_key || 'affix_trigger', { effect_id: effect.effect_id, unit_id: target.defId, before: old, after: target.hp }, '💧 ' + (target.name || target.defId) + ' 回复 ' + (params.amount || 1)); }
        return target;
      case 'add_shield':
        var u = ctx.sourceUnit || (bzState() && bzState().ownedUnits && bzState().ownedUnits[0]); if (u) { u.shield = (u.shield || 0) + (params.amount || 1); writeStructuredLog(effect.log_key || 'affix_trigger', { effect_id: effect.effect_id, unit_id: u.defId, shield: u.shield }, '🛡 ' + (u.name || u.defId) + ' 护盾 +' + (params.amount || 1)); }
        return u;
      case 'modify_ap':
        if (ctx.actor) ctx.actor.ap = Math.max(0, (ctx.actor.ap || 3) + (params.amount || 0));
        writeStructuredLog(effect.log_key || 'affix_trigger', { effect_id: effect.effect_id, amount: params.amount || 0 }, '🌪 AP变化 ' + (params.amount || 0));
        return ctx.actor;
      case 'deal_damage':
        var target = ctx.target || ctx.actor || ctx.monster;
        if (target) { var hp0 = target.hp || 0; var dmg = params.amount === 'same_as_explode_damage' ? (ctx.damage || 0) : (params.amount || ctx.damage || 1); target.hp = Math.max(0, hp0 - dmg); if (target.hp <= 0) target.dead = true; writeStructuredLog(effect.log_key || 'effect_damage', { effect_id: effect.effect_id, before: hp0, after: target.hp, damage: dmg }, '⚔️ 效果伤害 -' + dmg); }
        return target;
      case 'modify_shop_offer_weight': return true;
      case 'modify_reroll_cost': return true;
      default:
        writeStructuredLog(effect.log_key || 'effect_resolve', { effect_id: effect.effect_id, type: effect.type }, '✨ 效果触发：' + (effect.name || effect.effect_id || effect.type));
        return null;
    }
  }

  function bzConditionPass(cond, ctx) {
    cond = cond || {}; ctx = ctx || {};
    if (cond.element_any && cond.element_any.length && cond.element_any.indexOf(ctx.element || ctx.el) < 0) return false;
    if (cond.source_tier && ctx.sourceUnit) {
      if (tierNumToName(ctx.sourceUnit.level || 1) !== cond.source_tier && ctx.sourceUnit.quality !== cond.source_tier && ctx.sourceUnit.quality !== ({diamond:'钻石',gold:'黄金',silver:'白银',bronze:'青铜'}[cond.source_tier])) return false;
    }
    if (cond.target_tags_any && cond.target_tags_any.length) {
      var set = ctx.targetTags || (ctx.targetUnit ? bzTagsFromUnit(ctx.targetUnit) : {});
      if (!cond.target_tags_any.some(function(t){ return set[t]; })) return false;
    }
    return true;
  }

  function bazaarRunTrigger(triggerId, ctx) {
    ctx = ctx || {};
    var results = [];
    var er = getBazaarLikeTable('effect_resolve_rule');
    var rules = (er && er.resolve_rules) || [];
    rules.forEach(function(rule){
      if (rule.trigger_id !== triggerId) return;
      if (rule.source_card_id) {
        var state = bzState();
        var hasSource = false;
        if (state && rule.source_card_id.indexOf('relic_') === 0) hasSource = (state.relics || []).some(function(r){ return r.id === rule.source_card_id; });
        if (state && rule.source_card_id.indexOf('pal_') === 0) hasSource = (state.ownedUnits || []).some(function(u){ return (u.defId === rule.source_card_id || u.unitId === rule.source_card_id) && (rule.condition && rule.condition.source_tier ? tierNumToName(u.level || 1) === rule.condition.source_tier : true); });
        if (!hasSource && rule.source_card_id !== 'terrain_trap') return;
      }
      if (!bzConditionPass(rule.condition, ctx)) return;
      results.push(bazaarResolveType(rule, ctx));
    });
    // 词缀效果也走同一 trigger 入口。
    var ar = getBazaarLikeTable('affix_rule');
    var affixes = (ar && ar.affixes) || [];
    var effects = (ar && ar.affix_effects) || [];
    var state = bzState();
    (state && state.ownedUnits || []).forEach(function(unit){
      (unit.affixes || []).forEach(function(affixId){
        var affix = affixes.find(function(a){ return a.affix_id === affixId; });
        (affix && affix.effect_refs || []).forEach(function(effectId){
          var fx = effects.find(function(e){ return e.effect_id === effectId; });
          if (!fx || fx.trigger_id !== triggerId) return;
          if (!bzConditionPass(fx.condition, ctx)) return;
          results.push(bazaarResolveType(Object.assign({log_key:'affix_trigger'}, fx), Object.assign({sourceUnit: unit}, ctx)));
        });
      });
    });
    return results;
  }

  function bazaarPickShopAction(ctx) {
    var state = bzState(); ctx = ctx || {};
    var offers = ctx.offers || (state && state.shopItems && state.shopItems.units) || [];
    var gold = ctx.gold != null ? ctx.gold : (state && state.gold) || 0;
    var profile = ((getBazaarLikeTable('ai_shop_pick_rule') || {}).ai_profiles || [])[0] || {};
    var heroBias = (state && state.heroInfo && state.heroInfo.id === 'ember_tamer') ? {fire:true, burst:true, summon:true} : {};
    var best = null;
    offers.forEach(function(o){
      var score = 0;
      var tags = {}; (o.tags || []).forEach(function(t){ tags[t]=true; });
      if (gold >= (o.cost || 999)) score += 20;
      if (tags.fire || tags.burst || tags.summon) score += 80;
      if (tags[Object.keys(heroBias)[0]]) score += 20;
      var dup = state && state.ownedUnits && state.ownedUnits.some(function(u){ return u.defId === (o.defId || o.unitId); });
      if (dup) score += 75;
      var q = {'青铜':1,'白银':2,'黄金':3,'钻石':4}[o.quality] || 1;
      score += q * 15;
      if (gold < (o.cost || 0)) score = -999;
      if (!best || score > best.score) best = { action: 'buy', item: o, score: score, profile_id: profile.profile_id || 'default_auto_player' };
    });
    if (best && best.score >= 60) return best;
    var merchantId = state && state.shopMerchant && state.shopMerchant.merchant_id;
    var rr = merchantId ? getRerollRuleById(merchantId) : null;
    if (rr && (state._shopRerollLeft == null || state._shopRerollLeft > 0) && gold >= (rr.reroll_cost || 1)) return { action: 'reroll', score: 50, profile_id: profile.profile_id || 'default_auto_player' };
    return { action: 'leave', score: 0, profile_id: profile.profile_id || 'default_auto_player' };
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
  g.getBazaarLikeTable = getBazaarLikeTable;
  g.getBazaarLikeSchema = function () {
    return {
      source_meta: getBazaarLikeTable('source_meta'),
      card_master: getBazaarLikeTable('card_master'),
      merchant_master: getBazaarLikeTable('merchant_master'),
      merchant_rule: getBazaarLikeTable('merchant_rule'),
      merchant_pool_rule: getBazaarLikeTable('merchant_pool_rule'),
      merchant_reroll_rule: getBazaarLikeTable('merchant_reroll_rule'),
      event_master: getBazaarLikeTable('event_master'),
      event_rule: getBazaarLikeTable('event_rule'),
      reward_table: getBazaarLikeTable('reward_table'),
      encounter_schedule: getBazaarLikeTable('encounter_schedule'),
      economy_rule: getBazaarLikeTable('economy_rule'),
      effect_trigger_rule: getBazaarLikeTable('effect_trigger_rule'),
      effect_resolve_rule: getBazaarLikeTable('effect_resolve_rule'),
      pve_reward_rule: getBazaarLikeTable('pve_reward_rule'),
      affix_rule: getBazaarLikeTable('affix_rule'),
      ai_shop_pick_rule: getBazaarLikeTable('ai_shop_pick_rule'),
      log_template: getBazaarLikeTable('log_template'),
      compatibility_rule: getBazaarLikeTable('compatibility_rule')
    };
  };
  g.rollBazaarLikeShopOffers = rollBazaarLikeShopOffers;
  g.selectBazaarMerchant = selectBazaarMerchant;
  g.buildBazaarRuntimeCards = buildBazaarRuntimeCards;
  g.writeStructuredLog = writeStructuredLog;
  g.getBazaarRewardPool = getBazaarRewardPool;
  g.getBazaarRewardList = getBazaarRewardList;
  g.bazaarResolveReward = bazaarResolveReward;
  g.bazaarResolveRewardPool = bazaarResolveRewardPool;
  g.bazaarAddHeroXp = bazaarAddHeroXp;
  g.bazaarApplyHeroLevelReward = bazaarApplyHeroLevelReward;
  g.bazaarResolvePveReward = bazaarResolvePveReward;
  g.bazaarGrantAffix = bazaarGrantAffix;
  g.bazaarRunTrigger = bazaarRunTrigger;
  g.bazaarPickShopAction = bazaarPickShopAction;
  g.bazaarLevelUpPal = bazaarLevelUpPal;
  g.bazaarApplyPalLevelStats = bazaarApplyPalLevelStats;
  g.bazaarGetEffectiveUnitLevelData = bazaarGetEffectiveUnitLevelData;
  g.getBazaarRuntimeUnitTags = bzTagsFromUnit;

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
    var bc = getBazaarLikeCapacityCompat();
    if (bc) return bc;
    var sc = getShopConfig();
    if (sc && sc.shop_runtime && sc.shop_runtime.capacity) {
      return sc.shop_runtime.capacity;
    }
    return { active_capacity: 10, backpack_capacity: 20, shop_capacity: 10 };
  };

  /** 获取商店经济配置（收入/利息/费用） */
  g.getShopEconomyConfig = function () {
    var be = getBazaarLikeEconomyCompat();
    if (be) return be;
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
