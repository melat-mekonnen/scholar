const express = require("express");
const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");
const { authMiddleware } = require("../middleware/authMiddleware");
const documentsController = require("../controllers/documentsController");

const router = express.Router();

const uploadDir = documentsController.ensureUploadsDir();
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

function requireAdminOrManager(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "manager")) {
    return res.status(403).json({ message: "Admin or manager access required" });
  }
  return next();
}

router.get("/", documentsController.list);
router.get("/:id", documentsController.getById);
router.get("/:id/download", documentsController.download);

router.post(
  "/",
  authMiddleware,
  requireAdminOrManager,
  upload.single("file"),
  documentsController.upload
);
router.put("/:id", authMiddleware, requireAdminOrManager, documentsController.update);
router.delete("/:id", authMiddleware, requireAdminOrManager, documentsController.remove);

module.exports = router;

