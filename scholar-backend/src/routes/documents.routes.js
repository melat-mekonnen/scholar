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

function requireAdminManagerOrOwner(req, res, next) {
  const r = req.user?.role;
  if (!req.user || (r !== "admin" && r !== "manager" && r !== "owner")) {
    return res.status(403).json({ message: "Admin, owner, or manager access required" });
  }
  return next();
}

router.get("/", documentsController.list);
router.get("/:id", documentsController.getById);
router.get("/:id/download", documentsController.download);

router.post(
  "/",
  authMiddleware,
  requireAdminManagerOrOwner,
  upload.single("file"),
  documentsController.upload
);
router.put("/:id", authMiddleware, requireAdminManagerOrOwner, documentsController.update);
router.delete("/:id", authMiddleware, requireAdminManagerOrOwner, documentsController.remove);

module.exports = router;

