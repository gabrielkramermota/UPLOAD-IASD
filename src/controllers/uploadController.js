const path = require("path");
const fs = require("fs");

const uploadController = {
  uploadFile: (req, res) => {
    if (req.files && req.files.length > 0) {
      let newFileName = req.body.newFileName;

      req.files.forEach((file) => {
        // Verifica se foi fornecido um novo nome para o arquivo
        if (newFileName) {
          const extension = path.extname(file.originalname);
          newFileName = `${newFileName}${extension}`;
          
          // Caminho absoluto para a pasta uploads fora de src
          const uploadsPath = path.resolve(__dirname, "../../uploads");
          const newPath = path.join(uploadsPath, newFileName);

          // Renomeia o arquivo no servidor
          try {
            fs.renameSync(file.path, newPath);
          } catch (err) {
            return res.status(500).send(`Erro ao renomear o arquivo: ${err.message}`);
          }
        }
      });

      res.redirect(`/success.html?message=Arquivos enviados com sucesso!`);
    } else {
      res.send("Erro ao enviar arquivos.");
    }
  },
};

module.exports = uploadController;
