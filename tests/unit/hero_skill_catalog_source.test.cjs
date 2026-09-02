const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseCsv } = require('../../src/core/csvData.cjs');

const root = path.resolve(__dirname, '../..');
const csvDir = path.join(root, 'data', 'csv');
const qualities = ['bronze', 'silver', 'gold', 'diamond'];

function rows(name) {
  return parseCsv(fs.readFileSync(path.join(csvDir, name), 'utf8'));
}

function ids(value) {
  return String(value || '').split(/[,，、]/).map(item => item.trim()).filter(Boolean);
}

function sorted(values) {
  return [...values].sort();
}

test('HERO_SKILLS workbook domain exports a rebuildable first slice', () => {
  const skills = rows('43_hero_skills.csv');
  const sources = rows('34_bazaar_objects.csv');
  const mappings = rows('35_bazaar_shop_mapping.csv');
  const tags = rows('42_bazaar_tag_catalog.csv');
  const sourceById = new Map(sources.map(row => [row.object_id, row]));
  const trainerIds = new Set(mappings.filter(row => row.source_node_type === 'trainer').map(row => row.stall_id));
  const formalTagIds = new Set(tags.filter(row => row.catalog_status === 'playable').map(row => row.tag_id));

  assert.equal(skills.length, 7, 'first slice keeps seven fully specified representative definitions');
  assert.deepEqual(new Set(skills.map(row => row.completeness)), new Set(['slice']));
  assert.equal(new Set(skills.map(row => row.catalog_revision)).size, 1, 'one content revision owns the slice');
  assert.equal(new Set(skills.map(row => row.skill_id)).size, skills.length, 'hero skill ids are unique');
  assert.equal(new Set(skills.map(row => row.source_object_id)).size, skills.length, 'source audit ids are one-to-one');
  assert.deepEqual(new Set(skills.map(row => row.base_quality)), new Set(qualities), 'slice covers all four base qualities');
  assert.equal(trainerIds.size, 15, 'source mapping still owns exactly fifteen trainers');

  const effectTypes = new Set();
  const triggerEvents = new Set();
  for (const skill of skills) {
    assert.equal(skill.owner_hero_id, 'hero_001');
    assert.equal(skill.source_namespace, 'bazaar_skill_audit');
    assert.equal(skill.source_record_type, 'skill');
    assert.match(skill.name_zh, /[\u3400-\u9fff]/u);
    assert.match(skill.description_zh, /[\u3400-\u9fff]/u);
    assert.ok(!Object.hasOwn(skill, 'source_name') && !Object.hasOwn(skill, 'source_effect'), 'English audit text is not executable catalog data');
    assert.ok(!Object.hasOwn(skill, 'build_tags'), 'hero skills reference pet build identity but never own build_tags');
    const tagReferences = ids(skill.tag_references);
    assert.ok(tagReferences.length > 0, `${skill.skill_id} declares at least one formal tag reference`);
    assert.ok(tagReferences.every(tagId => formalTagIds.has(tagId)), `${skill.skill_id} references only playable tag catalog ids`);

    const source = sourceById.get(skill.source_object_id);
    assert.ok(source, `${skill.skill_id} source exists`);
    assert.equal(source.source_type, 'skill', `${skill.skill_id} points only to a reserved skill audit row`);
    assert.equal(source.catalog_status, 'reference_reserved', `${skill.skill_id} remains reference-only`);
    assert.equal(source.identity_confirmed, 'true', `${skill.skill_id} keeps the source identity audit`);
    assert.equal(source.rule_verified, 'false', `${skill.skill_id} does not claim current-rule verification`);
    assert.ok(String(source.rule_unresolved_fields || '').trim(), `${skill.skill_id} keeps unresolved rule fields explicit`);
    assert.equal(String(source.owner_hero_id ?? ''), '', `${skill.skill_id} hero ownership stays explicit in the new catalog`);
    assert.equal(source.source_tier, skill.base_quality, `${skill.skill_id} preserves source base quality`);
    const sourceTrainers = ids(skill.source_trainer_ids);
    assert.ok(sourceTrainers.length >= 2 && sourceTrainers.length <= 7, `${skill.skill_id} keeps 2-7 trainers`);
    assert.ok(sourceTrainers.every(id => trainerIds.has(id)), `${skill.skill_id} references only formal trainers`);
    assert.deepEqual(sorted(sourceTrainers), sorted(ids(source.source_stall_ids)), `${skill.skill_id} trainer relation is exact`);

    const trigger = JSON.parse(skill.trigger_json);
    const effects = JSON.parse(skill.effects_json);
    const values = JSON.parse(skill.quality_values_json);
    triggerEvents.add(trigger.event);
    assert.ok(Array.isArray(trigger.conditions) && trigger.conditions.length > 0);
    for (const condition of trigger.conditions) {
      assert.equal(typeof condition.params, 'object');
      assert.ok(!Array.isArray(condition.params));
      if (condition.type === 'always') {
        assert.deepEqual(condition.params, {});
      } else if (condition.type === 'event_skill_has_any_tag') {
        assert.deepEqual(Object.keys(condition.params), ['tags']);
        assert.ok(condition.params.tags.length > 0 && condition.params.tags.every(tagId => formalTagIds.has(tagId)));
      } else if (condition.type === 'hero_health_crossed_below_permille') {
        assert.deepEqual(Object.keys(condition.params), ['threshold_permille']);
        assert.ok(Number.isInteger(condition.params.threshold_permille) && condition.params.threshold_permille > 0 && condition.params.threshold_permille < 1000);
      } else if (condition.type === 'triggering_pet_size_is') {
        assert.deepEqual(condition.params, { size: 'large' });
      } else {
        assert.fail(`unknown condition type: ${condition.type}`);
      }
    }
    assert.equal(typeof trigger.allow_secondary_events, 'boolean');
    assert.ok(['battle', 'event'].includes(trigger.limit_scope));
    const valueKeys = [];
    if (trigger.max_triggers_value_key) valueKeys.push(trigger.max_triggers_value_key);
    else assert.ok(Number.isInteger(trigger.max_triggers) && trigger.max_triggers > 0);
    assert.ok(Array.isArray(effects) && effects.length > 0);
    for (const effect of effects) {
      effectTypes.add(effect.type);
      assert.ok(effect.id && effect.target && Array.isArray(effect.value_keys) && effect.value_keys.length > 0);
      if (Object.hasOwn(effect.params, 'required_tags_all')) {
        assert.ok(
          Array.isArray(effect.params.required_tags_all)
            && effect.params.required_tags_all.length > 0
            && effect.params.required_tags_all.every(tagId => formalTagIds.has(tagId)),
          `${skill.skill_id}.${effect.id} requires only playable tag catalog ids`,
        );
      }
      valueKeys.push(...effect.value_keys);
    }
    assert.equal(new Set(valueKeys).size, valueKeys.length, `${skill.skill_id} value keys are unambiguous`);
    const baseIndex = qualities.indexOf(skill.base_quality);
    assert.deepEqual(sorted(Object.keys(values)), sorted(qualities.slice(baseIndex)), `${skill.skill_id} owns every reachable quality and no lower tier`);
    for (const quality of qualities.slice(baseIndex)) {
      assert.deepEqual(sorted(Object.keys(values[quality])), sorted(valueKeys), `${skill.skill_id}.${quality} has complete values`);
      assert.ok(Object.values(values[quality]).every(value => Number.isInteger(value) && value > 0), `${skill.skill_id}.${quality} values are positive integers`);
    }
  }

  assert.ok(triggerEvents.has('BATTLE_STARTED'));
  assert.ok(triggerEvents.has('PET_SKILL_ROOT_SUCCEEDED'));
  assert.ok(triggerEvents.has('HERO_HEALTH_THRESHOLD_CROSSED'));
  assert.ok(triggerEvents.has('SHOP_REFRESH_REQUESTED'));
  const heavyHull = skills.find(skill => skill.skill_id === 'hero_skill_heavy_hull_lock');
  assert.deepEqual(JSON.parse(heavyHull.trigger_json).conditions, [{ type: 'triggering_pet_size_is', params: { size: 'large' } }]);
  for (const type of ['stat_modifier', 'shop_refresh_discount', 'cooldown_advance_ticks', 'cooldown_rate_permille', 'freeze_next_skill_root']) {
    assert.ok(effectTypes.has(type), `slice prepares ${type}`);
  }
});
