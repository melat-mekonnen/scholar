const fs = require("fs");
const path = require("path");

const DEFAULT_SEED_FILE = path.join(__dirname, "../../../../data/mastersportal-seeds.json");

function loadMastersPortalSeedFile(filePath = DEFAULT_SEED_FILE) {
  const abs = path.resolve(filePath);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw.scholarships;
  if (!Array.isArray(rows)) {
    throw new Error("MastersPortal seed file must be { scholarships: [...] } or an array");
  }
  return {
    discoverySearchUrl: raw.discoverySearchUrl || null,
    notes: raw.notes || null,
    scholarships: rows,
  };
}

module.exports = {
  DEFAULT_SEED_FILE,
  loadMastersPortalSeedFile,
};
