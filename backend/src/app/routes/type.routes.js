const express = require("express");

const { searchTypesTransaction } = require("../controllers/Type.controller");

const router = express.Router();

router.get("/", searchTypesTransaction);

module.exports = router;
