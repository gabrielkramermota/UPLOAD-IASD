const fs = require("fs");
const path = require("path");

const fileController = {
  listFilesAndLinks: (req, res) => {
    // Caminho absoluto para a pasta uploads
    const uploadsPath = path.resolve(__dirname, "../../uploads");

    // Verificar se o diretório existe
    if (!fs.existsSync(uploadsPath)) {
      return res
        .status(500)
        .send(`O diretório de uploads não existe: ${uploadsPath}`);
    }

    // Ler arquivos da pasta uploads
    let files;
    try {
      files = fs
        .readdirSync(uploadsPath)
        .filter((file) => file !== "links.txt");
    } catch (err) {
      return res
        .status(500)
        .send(`Erro ao ler o diretório de uploads: ${err.message}`);
    }

    // Caminho absoluto para o arquivo links.txt
    const linksPath = path.resolve(__dirname, "../../uploads/links.txt");
    let links;
    try {
      links = fs.existsSync(linksPath)
        ? fs.readFileSync(linksPath, "utf8").split("\n").filter(Boolean)
        : [];
    } catch (err) {
      return res
        .status(500)
        .send(`Erro ao ler o arquivo de links: ${err.message}`);
    }

    // Gerar HTML para arquivos e links
    const fileLinksHtml = files
      .map(
        (file) =>
          `<a href="/uploads/${file}" class="text-blue-500 hover:underline">${file}</a>`
      )
      .join("<br>");

    const linksHtml = links
      .map(
        (link) =>
          `<a href="${link}" target="_blank" class="text-blue-500 hover:underline">${link}</a>`
      )
      .join("<br>");

    res.send(`${fileLinksHtml}<br><br>${linksHtml}`);
  },

  listDownloads: (req, res) => {
    // Caminho absoluto para a pasta downloads
    const downloadsPath = path.resolve(__dirname, "../../downloads");

    // Verificar se o diretório existe
    if (!fs.existsSync(downloadsPath)) {
      return res
        .status(500)
        .send(`O diretório de downloads não existe: ${downloadsPath}`);
    }

    // Ler arquivos da pasta downloads
    let files;
    try {
      files = fs.readdirSync(downloadsPath);
    } catch (err) {
      return res
        .status(500)
        .send(`Erro ao ler o diretório de downloads: ${err.message}`);
    }
    res.json(files);
  }
};

module.exports = fileController;
