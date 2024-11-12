const express = require("express");
const linkController = require("../controllers/linkController");

const router = express.Router();

router.post("/link", linkController.sendLink);

module.exports = router;
