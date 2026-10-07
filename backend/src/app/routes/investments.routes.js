const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  createMovement,
  deleteMovement,
  deleteMovements,
  listMovements,
  updateMovement,
} = require("../controllers/Investment.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", listMovements);
router.post("/", createMovement);
router.post("/bulk-delete", deleteMovements);
router.patch("/:id", updateMovement);
router.delete("/:id", deleteMovement);

module.exports = router;
