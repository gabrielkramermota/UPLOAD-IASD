const os = require("os");
const qrcode = require("qrcode");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  const wifiInterface = interfaces["Wi-Fi"] || interfaces["wlan0"];

  if (wifiInterface) {
    for (let alias of wifiInterface) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }

  for (let iface in interfaces) {
    for (let alias of interfaces[iface]) {
      if (alias.family === "IPv4" && !alias.internal) {
        return alias.address;
      }
    }
  }

  return "localhost";
};

const createQRCodePDF = async (url) => {
  const pdfDir = path.join(__dirname, "../../qrcode");
  const pdfPath = path.join(pdfDir, "qrcode.pdf");

  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
  }

  if (!fs.existsSync(pdfPath)) {
    try {
      const qrImage = await qrcode.toDataURL(url);

      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(pdfPath));

      doc
        .fontSize(25)
        .text("ENVIE SEU ARQUIVO POR AQUI:", { align: "center", margin: 20 });

      doc.image(qrImage, {
        fit: [250, 250],
        align: "center",
        valign: "center"
      });

      doc.end();
    } catch (err) {
      console.error("Erro ao criar o PDF com QR Code:", err);
    }
  }
};

module.exports = { getLocalIP, createQRCodePDF };
