const express = require("express");
const fs = require("fs");

const uploadRoutes = require('./src/routes/uploadRoutes');
const linkRoutes = require("./src/routes/linkRoutes");
const fileRoutes = require("./src/routes/fileRoutes");
const qrcodeRoutes = require("./src/routes/qrcodeRoutes");

const {
  getLocalIP,
  createQRCodePDF
} = require("./src/controllers/qrcodeController");

const qrcode = require("qrcode");

const app = express();
const port = 3000;

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`Pasta '${dir}' criada com sucesso.`);
  }
}

ensureDirExists("./downloads");
ensureDirExists("./uploads");

app.use(express.urlencoded({ extended: true }));

app.use(express.static("src/public"));
app.use("/uploads", express.static("uploads"));
app.use("/downloads", express.static("downloads"));

app.use(uploadRoutes);
app.use(linkRoutes);
app.use(fileRoutes);
app.use(qrcodeRoutes);

app.listen(port, "0.0.0.0", async () => {
  const localIP = getLocalIP();
  const url = `http://${localIP}:${port}`;

  try {
    const qr = await qrcode.toString(url, { type: "terminal" });
    console.log(`\nAcesse o aplicativo escaneando o QR Code abaixo:\n`);
    console.log(qr);
    console.log(`Aplicativo rodando em ${url}`);

    await createQRCodePDF(url);
  } catch (err) {
    console.error("Erro ao gerar o QR Code:", err);
  }
});
