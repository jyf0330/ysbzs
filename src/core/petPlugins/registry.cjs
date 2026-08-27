const plugins = [
  require('./mech_element_spread_adjacent.cjs'),
  require('./mech_element_apply_bonus.cjs'),
  require('./mech_element_pair_bonus.cjs'),
  require('./mech_win_gold_bonus.cjs'),
  require('./mech_element_layer_threshold_bonus.cjs')
];

const PET_PLUGINS = Object.freeze(Object.fromEntries(plugins.map(plugin => [plugin.id, plugin])));
const PET_PLUGIN_STATUS = Object.freeze(Object.fromEntries(plugins.map(plugin => [plugin.id, 'implemented'])));

module.exports = { PET_PLUGINS, PET_PLUGIN_STATUS };
