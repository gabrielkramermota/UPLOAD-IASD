const fs = require("fs");

const linkController = {
  sendLink: (req, res) => {
    const link = req.body.link;

    if (link) {
      fs.appendFileSync("uploads/links.txt", link + "\n");
      res.redirect(`/success.html?message=Link enviado com sucesso!`);
    } else {
      res.send("Erro ao enviar link.");
    }
  }
};

module.exports = linkController;
