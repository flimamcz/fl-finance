const express = require("express");

const { searchTypesTransaction } = require("../controllers/Type.controller");
const { authenticate } = require('../middlewares/auth.middleware');


const router = express.Router();

router.get("/", authenticate, searchTypesTransaction);

module.exports = router;
