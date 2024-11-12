const express = require("express");
const fileController = require("../controllers/fileController");

const router = express.Router();

router.get("/files", fileController.listFilesAndLinks);
router.get("/list-downloads", fileController.listDownloads);

module.exports = router;
