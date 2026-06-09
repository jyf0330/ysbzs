const fs = require('fs');
const path = require('path');

function safeSlot(slotId) {
  return String(slotId || 'slot1').replace(/[^a-zA-Z0-9_.-]/g, '_');
}
function createFileStorage(rootDir) {
  const root = path.resolve(rootDir || path.join(process.cwd(), '.ysbzs-saves'));
  fs.mkdirSync(root, { recursive: true });
  function fileFor(slotId) { return path.join(root, `${safeSlot(slotId)}.json`); }
  return {
    root,
    save(slotId, saveDoc) { const id = safeSlot(slotId); fs.writeFileSync(fileFor(id), JSON.stringify(saveDoc, null, 2)); return { ok: true, slotId: id, file: fileFor(id) }; },
    load(slotId) { const id = safeSlot(slotId); const file = fileFor(id); if (!fs.existsSync(file)) return null; return JSON.parse(fs.readFileSync(file, 'utf8')); },
    delete(slotId) { const id = safeSlot(slotId); const file = fileFor(id); if (!fs.existsSync(file)) return false; fs.unlinkSync(file); return true; },
    list() { return fs.readdirSync(root).filter(f => f.endsWith('.json')).map(f => path.basename(f, '.json')).sort(); }
  };
}
module.exports = { createFileStorage };
