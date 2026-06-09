const DEFAULT_PLAYER_ID = 'p1';
const DEFAULT_PLAYER_NAME = '玩家1';

function makeBattleId(opts = {}) {
  return opts.battleId || `battle_${String(opts.day || 1).padStart(2, '0')}_${String(opts.seed || 'local')}`;
}

function ensureDefaultPlayersAndTeams(state, opts = {}) {
  const playerId = opts.playerId || DEFAULT_PLAYER_ID;
  state.mode = opts.mode || state.mode || 'solo';
  state.battleId = state.battleId || makeBattleId(opts);
  state.players = state.players || {};
  if (!state.players[playerId]) {
    state.players[playerId] = { id: playerId, name: opts.playerName || DEFAULT_PLAYER_NAME, teamId: 'team_player', role: 'host' };
  }
  state.teams = state.teams || {};
  state.teams.team_player = state.teams.team_player || { id: 'team_player', side: 'player', type: 'human', playerIds: [playerId] };
  if (!state.teams.team_player.playerIds.includes(playerId)) state.teams.team_player.playerIds.push(playerId);
  state.teams.team_enemy = state.teams.team_enemy || { id: 'team_enemy', side: 'enemy', type: 'ai', playerIds: [] };
  state.turn = state.turn || { activeTeamId: 'team_player', activePlayerId: playerId, readyPlayerIds: [] };
  state.turn.activeTeamId = state.turn.activeTeamId || 'team_player';
  state.turn.activePlayerId = state.turn.activePlayerId || playerId;
  state.turn.readyPlayerIds = Array.isArray(state.turn.readyPlayerIds) ? state.turn.readyPlayerIds : [];
  state.stateVersion = Number.isFinite(Number(state.stateVersion)) ? Number(state.stateVersion) : 0;
  state.nextCommand = Number.isFinite(Number(state.nextCommand)) ? Number(state.nextCommand) : 1;
  state.commandLog = Array.isArray(state.commandLog) ? state.commandLog : [];
  state.rngState = state.rngState || { seed: opts.seed || state.battleId, index: 0 };
  return state;
}

function inferTeamId(unit) {
  if (!unit) return null;
  const camp = unit.camp || unit.side;
  if (camp === 'player' || unit.side === 'hero' || unit.side === 'hero_leader') return 'team_player';
  if (camp === 'enemy' || unit.side === 'enemy' || unit.side === 'boss') return 'team_enemy';
  return unit.teamId || null;
}

function defaultControllerIdForUnit(state, unit) {
  const teamId = unit && (unit.teamId || inferTeamId(unit));
  const team = teamId && state.teams && state.teams[teamId];
  if (team && team.type === 'human' && team.playerIds && team.playerIds.length) return team.playerIds[0];
  if (team && team.type === 'ai') return 'ai';
  return DEFAULT_PLAYER_ID;
}

function ensureUnitOwnership(state) {
  const all = [];
  if (state.leaders) {
    if (state.leaders.player) all.push(state.leaders.player);
    if (state.leaders.enemy) all.push(state.leaders.enemy);
  }
  for (const u of state.units || []) all.push(u);
  for (const unit of all) {
    if (!unit) continue;
    unit.teamId = unit.teamId || inferTeamId(unit);
    unit.controllerId = unit.controllerId || defaultControllerIdForUnit(state, unit);
  }
  return state;
}

function ensureMultiplayerState(state, opts = {}) {
  ensureDefaultPlayersAndTeams(state, opts);
  ensureUnitOwnership(state);
  return state;
}

function getPlayer(state, playerId = DEFAULT_PLAYER_ID) {
  ensureMultiplayerState(state, { playerId });
  return state.players[playerId] || null;
}

function getPlayerTeamId(state, playerId = DEFAULT_PLAYER_ID) {
  const p = getPlayer(state, playerId);
  return p ? p.teamId : null;
}

function canPlayerControlUnit(state, playerId, unit) {
  ensureMultiplayerState(state, { playerId });
  if (!unit) return false;
  if (unit.controllerId === playerId) return true;
  const teamId = getPlayerTeamId(state, playerId);
  if (teamId && unit.teamId === teamId) return true;
  return false;
}

function addPlayer(state, player) {
  ensureMultiplayerState(state);
  const id = player.id;
  if (!id) throw new Error('player.id is required');
  const teamId = player.teamId || (state.mode === 'pvp' ? `team_${id}` : 'team_player');
  state.players[id] = Object.assign({ id, name: id, teamId, role: 'member' }, player, { teamId });
  state.teams[teamId] = state.teams[teamId] || { id: teamId, side: teamId === 'team_player' ? 'player' : 'enemy', type: 'human', playerIds: [] };
  if (!state.teams[teamId].playerIds.includes(id)) state.teams[teamId].playerIds.push(id);
  return state.players[id];
}

module.exports = {
  DEFAULT_PLAYER_ID,
  ensureMultiplayerState,
  ensureDefaultPlayersAndTeams,
  ensureUnitOwnership,
  inferTeamId,
  getPlayer,
  getPlayerTeamId,
  canPlayerControlUnit,
  addPlayer
};
