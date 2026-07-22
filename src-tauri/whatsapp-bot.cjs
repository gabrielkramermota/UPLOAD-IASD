const { Client, NoAuth } = require("whatsapp-web.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  emitActivity,
  sanitizeExtension,
  sanitizeFileStem,
  uniqueFilePath,
} = require("./whatsapp-utils.cjs");

const args = process.argv.slice(2);
const uploadsPath = args[0] || path.join(__dirname, "..", "uploads");
const qrCodePath = args[1] || path.join(__dirname, "..", "qr-code.txt");
const statusPath = args[2] || path.join(__dirname, "..", "bot-status.json");
const sessionPath = args[3] || path.join(__dirname, "..", ".wwebjs_auth");
const cachePath = args[4] || path.join(__dirname, "..", ".wwebjs_cache");
const browserPath = args[5] || process.env.PUPPETEER_EXECUTABLE_PATH || "";

function nowIso() {
  return new Date().toISOString();
}

function serializeError(error) {
  if (!error) {
    return "Unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error.stack) {
    return String(error.stack);
  }

  if (error.message) {
    return String(error.message);
  }

  return String(error);
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function saveStatus(status) {
  const payload = {
    ...status,
    pid: process.pid,
    updatedAt: nowIso(),
  };

  try {
    fs.writeFileSync(statusPath, JSON.stringify(payload, null, 2));
  } catch (error) {
    console.error("Failed to write status file", serializeError(error));
  }
}

function saveQRCode(qr) {
  try {
    fs.writeFileSync(qrCodePath, qr || "");
  } catch (error) {
    console.error("Failed to write QR file", serializeError(error));
  }
}

function cleanSessionAndCache() {
  try {
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
      console.log("Removed session directory");
    }

    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log("Removed cache directory");
    }

    const botDir = path.dirname(cachePath);
    const cachePattern = /^\.wwebjs/;
    if (fs.existsSync(botDir)) {
      const files = fs.readdirSync(botDir);
      files.forEach((file) => {
        if (!cachePattern.test(file)) {
          return;
        }

        const filePath = path.join(botDir, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
            console.log(`Removed leftover directory: ${file}`);
          }
        } catch (error) {
          console.error(`Failed removing leftover ${file}`, serializeError(error));
        }
      });
    }
  } catch (error) {
    console.error("Failed to clean session/cache", serializeError(error));
  }
}

ensureDirectoryExists(path.dirname(statusPath));
ensureDirectoryExists(path.dirname(qrCodePath));
ensureDirectoryExists(uploadsPath);

saveStatus({ status: "loading", message: "Inicializando processo do bot WhatsApp" });
saveQRCode("");
cleanSessionAndCache();
saveStatus({ status: "loading", message: "Inicializando cliente WhatsApp" });

const client = new Client({
  authStrategy: new NoAuth(),
  puppeteer: {
    headless: true,
    ...(browserPath ? { executablePath: browserPath } : {}),
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
    userDataDir: sessionPath,
  },
});

let qrSeen = false;
setTimeout(() => {
  if (!qrSeen) {
    const message = "Codigo QR nao gerado apos 30 segundos";
    console.warn(message);
    saveStatus({ status: "loading", message });
  }
}, 30000);

client.on("loading_screen", (percent, message) => {
  const safePercent = typeof percent === "number" ? percent : -1;
  const safeMessage = message ? String(message) : "Loading";
  console.log(`Loading screen: ${safePercent}% | ${safeMessage}`);
  saveStatus({
    status: "loading",
    message: `Loading ${safePercent}% - ${safeMessage}`,
  });
});

client.on("change_state", (state) => {
  console.log(`WhatsApp state changed: ${state}`);
});

client.on("qr", (qr) => {
  qrSeen = true;
  console.log("QR code generated and saved");
  saveQRCode(qr);
  saveStatus({ status: "qr", message: "Codigo QR gerado. Aguardando leitura." });
});

client.on("authenticated", () => {
  console.log("WhatsApp authenticated");
  saveStatus({ status: "loading", message: "Autenticado. Aguardando estado pronto." });
});

client.on("ready", () => {
  console.log("WhatsApp bot is ready");
  saveStatus({ status: "ready", message: "Bot conectado e pronto" });
  saveQRCode("");

  if (fs.existsSync(cachePath)) {
    try {
      const cacheFiles = fs.readdirSync(cachePath);
      cacheFiles.forEach((file) => {
        const filePath = path.join(cachePath, file);
        const stats = fs.statSync(filePath);
        const isOld = Date.now() - stats.mtime.getTime() > 3600000;
        if (isOld && stats.isFile()) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error("Failed cleaning old cache files", serializeError(error));
    }
  }
});

client.on("message_create", async (msg) => {
  let chat;
  try {
    chat = await msg.getChat();
  } catch (error) {
    console.error("Failed to resolve chat", serializeError(error));
    return;
  }

  if (chat.isGroup) {
    return;
  }

  if (msg.body.startsWith("!arquivo") || msg.body.startsWith("!upload")) {
    if (!msg.hasMedia) {
      await msg.reply("Nenhuma midia anexada a esta mensagem.");
      return;
    }

    try {
      const media = await msg.downloadMedia();
      if (!media) {
        await msg.reply("Nenhuma midia encontrada para download.");
        return;
      }

      const rawExtension = (media.mimetype || "application/octet-stream").split("/")[1] || "bin";
      const extension = sanitizeExtension(rawExtension);
      const commandParts = msg.body.split(" ");
      const customFileName = sanitizeFileStem(
        commandParts[1],
        crypto.randomUUID().split("-")[0]
      );
      const filePath = uniqueFilePath(uploadsPath, customFileName, extension);
      const fileName = path.basename(filePath);

      fs.writeFileSync(filePath, media.data, "base64");
      emitActivity(filePath, customFileName);
      await msg.reply(`Midia salva como ${fileName} com sucesso.`);
      console.log(`Media saved from message_create: ${fileName}`);
    } catch (error) {
      const serialized = serializeError(error);
      console.error("Failed to download media", serialized);
      await msg.reply("Erro ao baixar a midia.");
    }

    return;
  }

  if (msg.body.startsWith("!ajuda")) {
    await msg.reply(
      "COMANDOS DISPONIVEIS:\n\n" +
        "!arquivo [nome_opcional] ou !upload [nome_opcional]\n" +
        "- Baixa e salva a midia anexada.\n\n" +
        "!links [nome_arquivo] [link1] [link2] ...\n" +
        "- Salva os links em arquivo de texto.\n\n" +
        "!ajuda\n" +
        "- Mostra esta ajuda."
    );
    return;
  }

  if (msg.body.startsWith("!links")) {
    const commandParts = msg.body.split(" ");
    let customFileName;
    try {
      customFileName = sanitizeFileStem(
        commandParts[1],
        crypto.randomUUID().split("-")[0]
      ).replace(/\.txt$/i, "");
    } catch (error) {
      await msg.reply("Nome de arquivo inválido.");
      return;
    }
    const links = commandParts.slice(2);

    if (links.length === 0) {
      await msg.reply("Nenhum link fornecido.");
      return;
    }

    const filePath = uniqueFilePath(uploadsPath, customFileName, "txt");
    const fileName = path.basename(filePath);
    const fileContent = links.join("\n");

    try {
      fs.writeFileSync(filePath, fileContent, "utf8");
      emitActivity(filePath, customFileName);
      await msg.reply(`Links salvos no arquivo ${fileName} com sucesso.`);
      console.log(`Links saved from message_create: ${fileName}`);
    } catch (error) {
      const serialized = serializeError(error);
      console.error("Failed to save links", serialized);
      await msg.reply("Erro ao salvar os links.");
    }
  }
});

client.on("auth_failure", (msg) => {
  const message = `Falha de autenticacao: ${String(msg || "desconhecido")}`;
  console.error(message);
  saveStatus({ status: "error", message });
});

client.on("disconnected", (reason) => {
  const message = `Desconectado: ${String(reason || "desconhecido")}`;
  console.warn(message);
  saveStatus({ status: "disconnected", message });
  cleanSessionAndCache();
});

client.on("error", (error) => {
  const message = `Erro no cliente: ${serializeError(error)}`;
  console.error(message);
  saveStatus({ status: "error", message });
});

process.on("unhandledRejection", (reason) => {
  const message = `Promessa rejeitada sem tratamento: ${serializeError(reason)}`;
  console.error(message);
  saveStatus({ status: "error", message });
});

process.on("uncaughtException", (error) => {
  const message = `Excecao nao tratada: ${serializeError(error)}`;
  console.error(message);
  saveStatus({ status: "error", message });
});

function shutdown(signal) {
  console.log(`Shutting down WhatsApp bot (${signal})`);
  saveStatus({ status: "stopped", message: `Parando bot via ${signal}` });

  client
    .destroy()
    .catch((error) => {
      console.error("Error while destroying client", serializeError(error));
    })
    .finally(() => {
      cleanSessionAndCache();
      process.exit(0);
    });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client
  .initialize()
  .then(() => {
    console.log("client.initialize resolved");
  })
  .catch((error) => {
    const message = `Falha na inicializacao: ${serializeError(error)}`;
    console.error(message);
    saveStatus({ status: "error", message });
    process.exit(1);
  });
