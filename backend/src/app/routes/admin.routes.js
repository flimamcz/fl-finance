"use strict";

const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireAdmin } = require("../middlewares/admin.middleware");
const {
  generateRecoveryCode,
  archiveUser,
  editUser,
  listUsers,
  restoreUser,
  setUserBlocked,
} = require("../controllers/Admin.controller");

const router = express.Router();

router.use(authenticate, requireAdmin);
router.get("/users", listUsers);
router.patch("/users/:id", editUser);
router.patch("/users/:id/block", setUserBlocked(true));
router.patch("/users/:id/unblock", setUserBlocked(false));
router.post("/users/:id/recovery-code", generateRecoveryCode);
router.delete("/users/:id", archiveUser);
router.patch("/users/:id/restore", restoreUser);

module.exports = router;
