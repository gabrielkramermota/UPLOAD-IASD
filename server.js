// libs
const express = require("express");
const fs = require("fs");
const qrcode = require("qrcode");
const cors = require("cors");

// routes
const uploadRoutes = require("./src/routes/uploadRoutes");
const linkRoutes = require("./src/routes/linkRoutes");
const fileRoutes = require("./src/routes/fileRoutes");
const qrcodeRoutes = require("./src/routes/qrcodeRoutes");
const videoRoutes = require("./src/routes/videoRoutes");
const {
  getLocalIP,
  createQRCodePDF
} = require("./src/controllers/qrcodeController");

// instancias
const app = express();

const port = 3000;

// funções para criar as pastas
function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
    console.log(`Pasta '${dir}' criada com sucesso.`);
  }
}
ensureDirExists("./downloads");
ensureDirExists("./uploads");

const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("src/public"));
app.use("/uploads", express.static("uploads"));
app.use("/downloads", express.static("downloads"));
app.use(uploadRoutes);
app.use(linkRoutes);
app.use(fileRoutes);
app.use(qrcodeRoutes);
app.use(videoRoutes);

// listen running
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
