const express = require("express");
const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");
const { authMiddleware } = require("../middleware/authMiddleware");
const documentsController = require("../controllers/documentsController");

const router = express.Router();

const uploadDir = documentsController.ensureUploadsDir();

// Strict Allowed List
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf", ".jpg", ".jpeg", ".png", ".webp"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const baseExt = path.extname(file.originalname || "").toLowerCase();
    const sanitizedBaseName = path.basename(file.originalname || "", baseExt)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 50);
    cb(null, `${Date.now()}-${randomUUID()}-${sanitizedBaseName}${baseExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error("UploadRejected: Invalid file extension."));
    }
    
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("UploadRejected: Invalid mime type."));
    }

    if (/\.(exe|sh|bat|cmd|js|vbs|msi|ps1|php|py|rb)/i.test(file.originalname)) {
      return cb(new Error("UploadRejected: Suspected executable script spoofing."));
    }

    cb(null, true);
  }
});

function requireAdminManagerOrOwner(req, res, next) {
  const r = req.user?.role;
  if (!req.user || (r !== "admin" && r !== "manager" && r !== "owner")) {
    return res.status(403).json({ message: "Admin, owner, or manager access required" });
  }
  return next();
}

function multerWrapper(req, res, next) {
  const uploadSingle = upload.single("file");
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.message && err.message.startsWith("UploadRejected:")) {
        req.uploadRejectionError = err.message;
        req.observabilityEvent = "rejected_upload"; // Tell tracing to mark this
        return res.status(400).json({ message: err.message });
      }
      if (err instanceof multer.MulterError) {
        req.observabilityEvent = "rejected_upload_size";
        return res.status(413).json({ message: err.message });
      }
      return next(err);
    }
    next();
  });
}

router.get("/", documentsController.list);
router.get("/:id", documentsController.getById);
router.get("/:id/download", documentsController.download);

router.post(
  "/",
  authMiddleware,
  requireAdminManagerOrOwner,
  multerWrapper,
  documentsController.upload
);
router.put("/:id", authMiddleware, requireAdminManagerOrOwner, documentsController.update);
router.delete("/:id", authMiddleware, requireAdminManagerOrOwner, documentsController.remove);

module.exports = router;

