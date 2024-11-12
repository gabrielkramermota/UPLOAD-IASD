const { Client, NoAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const downloadsPath = path.resolve(__dirname, "../../", "downloads");
const uploadsPath = path.resolve(__dirname, "../../", "uploads");

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectoryExists(downloadsPath);
ensureDirectoryExists(uploadsPath);

const client = new Client({
  authStrategy: new NoAuth()
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log(
    "Aplicativo rodando com sucesso! Mande uma mensagem para seu número com o seguinte comando: !ajuda"
  );
});

client.on("message_create", async (msg) => {
  const chat = await msg.getChat();
  if (chat.isGroup) return;

  if (msg.body === "!everyone") {
    let text = "";
    let ids = [];

    for (let participant of chat.participants) {
      ids.push(`${participant.id.user}@c.us`);
      text += ` @${participant.id.user} `;
    }

    await chat.sendMessage(text, { mentions: ids });
  }

  if (msg.body.startsWith("!arquivo")) {
    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();

        if (media) {
          let extension = media.mimetype.split("/")[1];
          const commandParts = msg.body.split(" ");
          const customFileName = commandParts[1] || uuidv4().split("-")[0];
          const fileName = `${customFileName}.${extension}`;
          const filePath = path.join(uploadsPath, fileName);

          fs.writeFileSync(filePath, media.data, "base64");
          msg.react("✅");
          await msg.reply(
            `Mídia baixada e salva como ${fileName} com sucesso! ✅`
          );
        } else {
          await msg.reply("Nenhuma mídia encontrada para download. ❌");
        }
      } catch (error) {
        console.error("Erro ao baixar a mídia:", error);
        msg.react("❌");
        await msg.reply("Erro ao baixar a mídia.");
      }
    } else {
      msg.react("⚠");
      await msg.reply("Nenhuma mídia anexada a esta mensagem. ⚠");
    }
  } else if (msg.body.startsWith("!ajuda")) {
    // Envia a lista de comandos primeiro
    await msg.reply(
      "*🔰COMANDOS DISPONÍVEIS:🔰*\n\n" +
        "*!arquivo [nome_opcional]*\n\n" +
        " - Baixa e salva a mídia anexada à mensagem. Se um nome for fornecido, será usado como nome do arquivo. Caso contrário, um nome será gerado.\n\n" +
        "*!links [nome_arquivo] [link1] [link2] ...*\n\n" +
        " - Os links fornecidos são enviados em um arquivo de texto. Se um nome de arquivo for fornecido, será usado. Caso contrário, um nome será gerado.\n\n" +
        "*EXEMPLO:*\n\n"
    );

    const mediaFilePath = path.resolve(
      __dirname,
      "../public/images/exemploAjudaBotWhatsapp.jpg"
    );

    const media = MessageMedia.fromFilePath(mediaFilePath);

    await client.sendMessage(msg.from, media);
  } else if (msg.body.startsWith("!links")) {
    const commandParts = msg.body.split(" ");
    const customFileName = commandParts[1] || `${uuidv4().split("-")[0]}.txt`;
    const links = commandParts.slice(2);

    if (links.length > 0) {
      const fileName = customFileName.endsWith(".txt")
        ? customFileName
        : `${customFileName}.txt`;
      const filePath = path.join(uploadsPath, fileName);
      const fileContent = links.join("\n");

      try {
        fs.writeFileSync(filePath, fileContent, "utf8");
        msg.react("✅");
        await msg.reply(`Links salvos no arquivo ${fileName} com sucesso! ✅`);
      } catch (error) {
        console.error("Erro ao salvar os links:", error);
        msg.react("❌");
        await msg.reply("Erro ao salvar os links.");
      }
    } else {
      msg.react("⚠");
      await msg.reply("Nenhum link fornecido. ⚠");
    }
  }
});

client.on("auth_failure", (msg) => {
  console.error("Autenticação falhou", msg);
});

client.on("disconnected", (reason) => {
  console.log("O cliente foi desconectado", reason);
});

client.initialize();

module.exports = client;
