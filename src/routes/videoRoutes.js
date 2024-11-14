// routes/videoRoutes.js
const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");

// Define a rota para o download de vídeo
router.post("/download-video", videoController.downloadVideo);

module.exports = router;
