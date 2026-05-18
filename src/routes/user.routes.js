const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/requireAdmin");
const { requireAdminOrOwner } = require("../middleware/requireAdminOrOwner");
const { allowAdminSelfOrOwner } = require("../middleware/allowAdminSelfOrOwner");
const userController = require("../controllers/userController");

const router = express.Router();

router.use(authMiddleware);

router.get("/users", requireAdminOrOwner, userController.list);
router.get("/users/:id", allowAdminSelfOrOwner(), userController.getById);
router.put("/users/:id", allowAdminSelfOrOwner(), userController.update);
router.delete("/users/:id", requireAdmin, userController.remove);
router.put("/users/:id/activate", requireAdmin, userController.activate);
router.put("/users/:id/role", requireAdminOrOwner, userController.changeRole);

module.exports = router;
