const express = require("express");
const uploadController = require("../controllers/uploadController");
const upload = require("../middlewares/multerConfig");

const router = express.Router();

router.post("/upload", upload.array("file"), uploadController.uploadFile);

module.exports = router;
