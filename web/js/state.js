export const ui = {
  vm: null,
  selectedUnitId: null,
  selectedSlotGlobal: null,
  selectedSlot: null,
  selectedCell: null,
  activeLogTab: 'events',
  busy: false,
  slotArmed: false,
  lastPhase: null,
  playerId: 'p1',
  nextCommandNo: 1,
  cellDetail: null,
  replay: { events: [], step: 0 },
  apBySlot: {}
};
