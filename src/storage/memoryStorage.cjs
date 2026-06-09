function createMemoryStorage() {
  const slots = new Map();
  return {
    save(slotId, saveDoc) { const id = slotId || 'slot1'; slots.set(id, JSON.parse(JSON.stringify(saveDoc))); return { ok: true, slotId: id }; },
    load(slotId) { const id = slotId || 'slot1'; const doc = slots.get(id); if (!doc) return null; return JSON.parse(JSON.stringify(doc)); },
    delete(slotId) { const id = slotId || 'slot1'; return slots.delete(id); },
    list() { return Array.from(slots.keys()).sort(); }
  };
}
module.exports = { createMemoryStorage };
