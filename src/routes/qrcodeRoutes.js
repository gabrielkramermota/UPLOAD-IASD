const express = require("express");
const path = require("path"); 

const router = express.Router();

router.get("/downloads-page", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "downloads.html"));
});

module.exports = router;
