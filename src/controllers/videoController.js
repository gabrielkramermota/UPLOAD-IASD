const fs = require("node:fs");
const path = require("node:path");
const youtubedl = require("youtube-dl-exec");

function sanitizeTitle(title) {
  return title.replace(/[<>:"/\\|?*]+/g, "").replace(/ +/g, "_");
}

class VideoController {
  async downloadVideo(req, res) {
    try {
      let { videoUrl } = req.body;
      if (!videoUrl) {
        return res.status(400).json({ message: "URL do vídeo não fornecida." });
      }

      // Remove parâmetros extras
      videoUrl = videoUrl.split("&")[0];

      const outputDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      // Obtém metadados do vídeo (para gerar nome limpo)
      const info = await youtubedl(videoUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        preferFreeFormats: true,
      });

      const videoTitle = sanitizeTitle(info.title || "video_sem_titulo");
      const outputPath = path.join(outputDir, `${videoTitle}.mp4`);
      const tempPath = path.join(outputDir, `${videoTitle}.temp.mp4`);

      // Remove arquivo final anterior, se existir
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

      // Baixa o vídeo diretamente para o arquivo temporário
      await youtubedl(videoUrl, {
        format: "best[height<=1080]",
        output: tempPath,
        noWarnings: true,
        preferFreeFormats: true,
        noPart: true, // evita arquivos .part/.temp duplos
      });

      // Aguarda o Windows liberar o arquivo
      await new Promise((r) => setTimeout(r, 1000));

      // Verifica se o download gerou o arquivo temporário
      if (!fs.existsSync(tempPath)) {
        throw new Error("Download não gerou arquivo temporário.");
      }

      // Renomeia o arquivo final
      fs.renameSync(tempPath, outputPath);

      // Remove quaisquer arquivos temporários restantes (.temp ou .temp.temp)
      const uploadFiles = fs.readdirSync(outputDir);
      uploadFiles.forEach((file) => {
        if (file.endsWith(".temp.mp4") || file.endsWith(".temp.temp.mp4")) {
          const filePath = path.join(outputDir, file);
          try {
            fs.unlinkSync(filePath);
          } catch (_) {}
        }
      });

      res.status(200).json({
        message: "Vídeo baixado com sucesso!",
        videoPath: path.basename(outputPath),
      });
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          message: "Erro ao baixar o vídeo",
          error: error.message,
        });
      }
    }
  }
}

module.exports = new VideoController();
