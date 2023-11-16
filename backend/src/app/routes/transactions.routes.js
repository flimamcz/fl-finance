const express = require("express");

const {
  searchTrasctions,
  createTrasaction,
} = require("../controllers/Transaction.controller");

const router = express.Router();

router.get("/", searchTrasctions);
router.post("/", createTrasaction);

module.exports = router;
