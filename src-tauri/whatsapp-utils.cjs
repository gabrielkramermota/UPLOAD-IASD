const fs = require("fs");
const path = require("path");

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const ACTIVITY_PREFIX = "UPLOAD_IASD_ACTIVITY:";

function sanitizeFileStem(input, fallback) {
  const value = String(input || "").trim();
  if (
    !value ||
    value === "." ||
    value === ".." ||
    path.isAbsolute(value) ||
    value.includes("/") ||
    value.includes("\\")
  ) {
    if (fallback) {
      return sanitizeFileStem(fallback);
    }
    throw new Error("Nome de arquivo inválido");
  }

  let safe = value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 120);

  if (!safe || safe === "." || safe === "..") {
    throw new Error("Nome de arquivo inválido");
  }
  if (WINDOWS_RESERVED.test(safe)) {
    safe = "_" + safe;
  }
  return safe;
}

function sanitizeExtension(input) {
  const value = String(input || "bin")
    .split(";")[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return value.slice(0, 12) || "bin";
}

function uniqueFilePath(rootDirectory, stem, extension) {
  const root = path.resolve(rootDirectory);
  const safeStem = sanitizeFileStem(stem);
  const safeExtension = sanitizeExtension(extension);
  let candidate = path.resolve(root, safeStem + "." + safeExtension);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.resolve(root, safeStem + " (" + counter + ")." + safeExtension);
    counter += 1;
  }

  const relative = path.relative(root, candidate);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("O arquivo resultante está fora da pasta de uploads");
  }
  return candidate;
}

function emitActivity(filePath, metadata) {
  const stats = fs.statSync(filePath);
  const payload = {
    type: "whatsapp_receive",
    filePath: path.resolve(filePath),
    fileSize: stats.size,
    metadata: String(metadata || ""),
  };
  process.stdout.write(ACTIVITY_PREFIX + JSON.stringify(payload) + "\n");
}

module.exports = {
  ACTIVITY_PREFIX,
  emitActivity,
  sanitizeExtension,
  sanitizeFileStem,
  uniqueFilePath,
};
