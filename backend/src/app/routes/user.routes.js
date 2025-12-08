const express = require("express");

const { createUser, searchUsers } = require("../controllers/User.controller");
const { authenticate } = require('../middlewares/auth.middleware');


const router = express.Router();

router.get("/", searchUsers);
router.post("/register", createUser);

module.exports = router;
