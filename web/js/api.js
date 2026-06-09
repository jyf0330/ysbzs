export async function api(ui, path, body) {
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'content-type': 'application/json', 'x-player-id': ui.playerId } : { 'x-player-id': ui.playerId },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export function makeCommand(ui, type, payload = {}) {
  const commandNo = ui.nextCommandNo++;
  return Object.assign({
    type,
    commandId: `client_${String(commandNo).padStart(6, '0')}`,
    playerId: ui.playerId,
    battleId: ui.vm?.battleId,
    baseStateVersion: ui.vm?.stateVersion ?? 0
  }, payload);
}
