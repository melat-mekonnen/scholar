const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireAdminOrOwner } = require("../middleware/requireAdminOrOwner");
const { allowAdminSelfOrOwner } = require("../middleware/allowAdminSelfOrOwner");
const userController = require("../controllers/userController");

const router = express.Router();

// Per-route auth only — do not use router.use(authMiddleware) here; this router is mounted at /api
// and would otherwise block public routes such as /api/scholarships/search.
router.get("/users", authMiddleware, requireAdminOrOwner, userController.list);
router.get("/users/:id", authMiddleware, allowAdminSelfOrOwner(), userController.getById);
router.put("/users/:id", authMiddleware, allowAdminSelfOrOwner(), userController.update);
router.delete("/users/:id", authMiddleware, requireAdmin, userController.remove);
router.put("/users/:id/activate", authMiddleware, requireAdmin, userController.activate);
router.put("/users/:id/role", authMiddleware, requireAdminOrOwner, userController.changeRole);

module.exports = router;
