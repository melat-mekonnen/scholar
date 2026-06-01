const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");
const {
  ensureCommunityUploadsDir,
  MAX_FILES_PER_MESSAGE,
  MAX_FILE_BYTES,
} = require("../utils/communityAttachments");

const uploadDir = ensureCommunityUploadsDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const communityUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_BYTES,
    files: MAX_FILES_PER_MESSAGE,
  },
});

module.exports = { communityUpload, ensureCommunityUploadsDir };
