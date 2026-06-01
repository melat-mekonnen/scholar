function parseShuffleSeed(raw) {
  const seed = String(raw || "").trim();
  if (!seed) return null;
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(seed)) return null;
  return seed;
}

/** Deterministic pseudo-random order for merged client-side sorts. */
function hashIdWithSeed(id, seed) {
  const input = `${String(id || "")}:${String(seed || "")}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function compareShuffledIds(leftId, rightId, seed) {
  const left = hashIdWithSeed(leftId, seed);
  const right = hashIdWithSeed(rightId, seed);
  if (left !== right) return left - right;
  return String(leftId || "").localeCompare(String(rightId || ""));
}

module.exports = {
  parseShuffleSeed,
  hashIdWithSeed,
  compareShuffledIds,
};
