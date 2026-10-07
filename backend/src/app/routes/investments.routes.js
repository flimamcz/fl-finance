const express = require("express");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  createMovement,
  listMovements,
} = require("../controllers/Investment.controller");

const router = express.Router();

router.use(authenticate);
router.get("/", listMovements);
router.post("/", createMovement);

module.exports = router;
