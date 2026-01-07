// Usar CommonJS mesmo com type: module no package.json (script isolado)
const { Client, NoAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Obter caminhos dos diretórios via argumentos ou usar padrão
const args = process.argv.slice(2);
const uploadsPath = args[0] || path.join(__dirname, "..", "uploads");
const qrCodePath = args[1] || path.join(__dirname, "..", "qr-code.txt");
const statusPath = args[2] || path.join(__dirname, "..", "bot-status.json");
const sessionPath = args[3] || path.join(__dirname, "..", ".wwebjs_auth");
const cachePath = args[4] || path.join(__dirname, "..", ".wwebjs_cache");

// Função para limpar cache e sessão
function cleanSessionAndCache() {
  try {
    // Limpar pasta de autenticação
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log("Cache de sessão removido");
    }
    
    // Limpar pasta de cache
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log("Cache removido");
    }
  } catch (error) {
    console.error("Erro ao limpar cache:", error);
  }
}

// Limpar cache ao iniciar (sempre começar limpo)
cleanSessionAndCache();

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectoryExists(uploadsPath);

// Função para salvar status
function saveStatus(status) {
  try {
    fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
  } catch (error) {
    console.error("Erro ao salvar status:", error);
  }
}

// Função para salvar QR code
function saveQRCode(qr) {
  try {
    fs.writeFileSync(qrCodePath, qr);
  } catch (error) {
    console.error("Erro ao salvar QR code:", error);
  }
}

const client = new Client({
  authStrategy: new NoAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    userDataDir: sessionPath // Usar o caminho fornecido para sessão
  }
});

client.on("qr", (qr) => {
  console.log("QR Code gerado - aguardando leitura na interface");
  // Não imprimir no terminal - apenas salvar para a interface
  // qrcode.generate(qr, { small: true }); // Removido - QR code só na interface
  saveQRCode(qr);
  saveStatus({ status: "qr", qr: qr });
});

client.on("ready", () => {
  console.log("Bot WhatsApp conectado!");
  saveStatus({ status: "ready", message: "Bot conectado e pronto para receber comandos" });
  saveQRCode(""); // Limpar QR code quando conectado
});

client.on("message_create", async (msg) => {
  const chat = await msg.getChat();
  if (chat.isGroup) return;

  if (msg.body.startsWith("!arquivo") || msg.body.startsWith("!upload")) {
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
    await msg.reply(
      "*🔰COMANDOS DISPONÍVEIS:🔰*\n\n" +
        "*!arquivo [nome_opcional]* ou *!upload [nome_opcional]*\n\n" +
        " - Baixa e salva a mídia anexada à mensagem. Se um nome for fornecido, será usado como nome do arquivo. Caso contrário, um nome será gerado.\n\n" +
        "*!links [nome_arquivo] [link1] [link2] ...*\n\n" +
        " - Os links fornecidos são enviados em um arquivo de texto. Se um nome de arquivo for fornecido, será usado. Caso contrário, um nome será gerado.\n\n" +
        "*!ajuda*\n\n" +
        " - Mostra esta mensagem de ajuda.\n\n"
    );
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
  saveStatus({ status: "error", message: "Falha na autenticação: " + msg });
});

client.on("disconnected", (reason) => {
  console.log("O cliente foi desconectado", reason);
  saveStatus({ status: "disconnected", message: "Bot desconectado: " + reason });
  // Limpar cache após desconexão
  setTimeout(() => {
    cleanSessionAndCache();
  }, 2000);
});

client.initialize();

// Manter o processo vivo
process.on("SIGINT", () => {
  console.log("Encerrando bot...");
  client.destroy().then(() => {
    cleanSessionAndCache();
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  console.log("Encerrando bot...");
  client.destroy().then(() => {
    cleanSessionAndCache();
    process.exit(0);
  });
});

