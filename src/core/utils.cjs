// Shared utilities used across core modules.
function deepClone(value) {
  return structuredClone(value);
}
module.exports = { deepClone };
