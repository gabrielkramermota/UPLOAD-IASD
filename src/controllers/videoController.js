const fs = require("node:fs");
const youtubedl = require("youtube-dl-exec");
const path = require("node:path");

let downloadProgress = 0;

function sanitizeTitle(title) {
  return title.replace(/[<>:"/\\|?*]+/g, "").replace(/ +/g, "_");
}

class VideoController {
  // Rota para download de vídeo
  async downloadVideo(req, res) {
    try {
      let { videoUrl } = req.body;

      videoUrl = videoUrl.split("&")[0];

      const outputDir = path.join(__dirname, "../../uploads");

      const outputFilePath = path.join(outputDir, "%(title)s.%(ext)s");

      const ydlOpts = {
        format: "best[height<=1080]",
        output: outputFilePath,
        noWarnings: true,
        progress: true,
        onProgress: (progress) => {
          downloadProgress = progress.percent;
        },
      };

      youtubedl(videoUrl, ydlOpts)
        .then((output) => {
          const fileName = path.basename(outputFilePath);

          res.status(200).json({
            message: "Vídeo baixado com sucesso",
            videoPath: fileName,
          });
        })
        .catch((error) => {
          res.status(500).json({
            message: "Erro ao baixar o vídeo",
            error: error.message,
          });
        });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Ocorreu um erro no download do vídeo",
          error: error.message,
        });
      }
    }
  }
}

module.exports = new VideoController();
