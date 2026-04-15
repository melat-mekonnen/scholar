const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/requireAdmin");
const userController = require("../controllers/userController");

const router = express.Router();

// IMPORTANT: Admin guard must only apply to /users routes,
// otherwise it blocks other /api routes like /api/profile.
router.use("/users", authMiddleware, requireAdmin);

router.get("/users", userController.list);
router.get("/users/:id", userController.getById);
router.put("/users/:id", userController.update);
router.delete("/users/:id", userController.remove);
router.put("/users/:id/activate", userController.activate);
router.put("/users/:id/role", userController.changeRole);

module.exports = router;

