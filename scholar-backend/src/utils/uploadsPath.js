const fs = require("fs");
const path = require("path");

/**
 * Root for community/document files. Set UPLOADS_ROOT on production (mounted volume).
 * Defaults to <cwd>/uploads for local dev.
 */
function getUploadsRoot() {
  const root = process.env.UPLOADS_ROOT || path.join(process.cwd(), "uploads");
  return path.resolve(root);
}

function uploadsSubdir(...segments) {
  const dir = path.join(getUploadsRoot(), ...segments);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  getUploadsRoot,
  uploadsSubdir,
};
