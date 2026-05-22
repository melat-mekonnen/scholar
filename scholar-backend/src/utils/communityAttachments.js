const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

const MAX_FILES_PER_MESSAGE = 4;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function ensureCommunityUploadsDir() {
  const dir = path.resolve(process.cwd(), "uploads", "community");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function classifyAttachment(mimeType, originalName) {
  const ext = path.extname(originalName || "").toLowerCase();
  if (mimeType.startsWith("image/")) return "image";
  if (ext === ".pdf" || mimeType === "application/pdf") return "pdf";
  if (
    ext === ".doc" ||
    ext === ".docx" ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "cv";
  }
  return null;
}

function validateUploadedFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  const kind = classifyAttachment(file.mimetype, file.originalname);
  if (!kind || !ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return { ok: false, reason: "Unsupported file type" };
  }
  if ((file.size || 0) > MAX_FILE_BYTES) {
    return { ok: false, reason: "File exceeds 8 MB limit" };
  }
  return { ok: true, kind };
}

function unlinkFiles(files) {
  for (const file of files) {
    if (file?.path) fs.unlink(file.path, () => {});
  }
}

module.exports = {
  ALLOWED_EXTENSIONS: [...ALLOWED_EXTENSIONS],
  MAX_FILES_PER_MESSAGE,
  MAX_FILE_BYTES,
  ensureCommunityUploadsDir,
  classifyAttachment,
  validateUploadedFile,
  unlinkFiles,
  randomUUID,
};
