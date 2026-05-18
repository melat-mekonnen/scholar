const express = require("express");
const multer = require("multer");
const path = require("path");
const { randomUUID } = require("crypto");
const scholarshipsController = require("../controllers/scholarshipsController");
const bookmarkController = require("../controllers/bookmarkController");
const documentsController = require("../controllers/documentsController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { optionalAuthMiddleware } = require("../middleware/optionalAuthMiddleware");
const { requireStudent } = require("../middleware/requireStudent");

const router = express.Router();
const uploadDir = documentsController.ensureUploadsDir();
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      cb(null, `${Date.now()}-${randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function requireAdminManagerOrOwner(req, res, next) {
  const r = req.user?.role;
  if (!req.user || (r !== "admin" && r !== "manager" && r !== "owner")) {
    return res.status(403).json({ message: "Admin, owner, or manager access required" });
  }
  return next();
}

router.post("/", authMiddleware, scholarshipsController.create);
router.put("/:id", authMiddleware, scholarshipsController.update);
router.delete("/:id", authMiddleware, scholarshipsController.remove);
router.get("/my-scholarships", authMiddleware, scholarshipsController.myScholarships);
router.get("/", optionalAuthMiddleware, scholarshipsController.list);
router.get("/filters", scholarshipsController.getFilters);
router.get("/search", optionalAuthMiddleware, scholarshipsController.search);
router.post(
  "/:id/documents",
  authMiddleware,
  requireAdminManagerOrOwner,
  upload.single("file"),
  (req, _res, next) => {
    req.body = { ...(req.body || {}), scholarshipId: req.params.id };
    next();
  },
  documentsController.upload,
);

router.post(
  "/:id/bookmark",
  authMiddleware,
  requireStudent,
  bookmarkController.addBookmark
);
router.delete(
  "/:id/bookmark",
  authMiddleware,
  requireStudent,
  bookmarkController.removeBookmark
);

router.get("/:id", optionalAuthMiddleware, scholarshipsController.getById);

module.exports = router;
