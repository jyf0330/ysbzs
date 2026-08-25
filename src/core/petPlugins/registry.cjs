const plugins = [
  require('./pet_pal_005_red_tail_fox.cjs'),
  require('./pet_pal_007_thunder_whisker_cat.cjs'),
  require('./pet_pal_009_fire_antler_deer.cjs'),
  require('./pet_pal_012_electric_quill_mouse.cjs'),
  require('./pet_pal_014_money_raccoon.cjs'),
  require('./pet_pal_017_black_horn_rhino.cjs'),
  require('./pet_pal_019_night_burrow_mole.cjs')
];

const PET_PLUGINS = Object.freeze(Object.fromEntries(plugins.map(plugin => [plugin.id, plugin])));
const PET_PLUGIN_STATUS = Object.freeze(Object.fromEntries(plugins.map(plugin => [plugin.id, 'implemented'])));

module.exports = { PET_PLUGINS, PET_PLUGIN_STATUS };
