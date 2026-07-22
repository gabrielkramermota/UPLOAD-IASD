const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const runtimeDir = path.join(projectRoot, "src-tauri", "whatsapp-runtime");
const rootPackage = require(path.join(projectRoot, "package.json"));
const nodeName = process.platform === "win32" ? "node.exe" : "node";
const nodeRelative = path.join("bin", nodeName);
const nodeTarget = path.join(runtimeDir, nodeRelative);
const runtimePackagePath = path.join(runtimeDir, "package.json");
const manifestPath = path.join(runtimeDir, "runtime-manifest.json");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: runtimeDir,
    env: { ...process.env, ...options.env },
    stdio: "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(command + " terminou com código " + result.status);
  }
}

function runNpm(args, options) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !fs.existsSync(npmCli)) {
    throw new Error("Execute a preparação por meio de npm run prepare:whatsapp-runtime");
  }
  run(process.execPath, [npmCli, ...args], options);
}

function findBrowserExecutable(directory) {
  if (!fs.existsSync(directory)) return null;
  const expected = process.platform === "win32"
    ? new Set(["chrome.exe"])
    : process.platform === "darwin"
      ? new Set(["Google Chrome for Testing"])
      : new Set(["chrome"]);
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (expected.has(entry.name)) return fullPath;
    }
  }
  return null;
}

function copyRuntimeSources() {
  fs.mkdirSync(path.dirname(nodeTarget), { recursive: true });
  fs.copyFileSync(process.execPath, nodeTarget);
  if (process.platform !== "win32") fs.chmodSync(nodeTarget, 0o755);
  for (const filename of ["whatsapp-bot.cjs", "whatsapp-utils.cjs"]) {
    fs.copyFileSync(
      path.join(projectRoot, "src-tauri", filename),
      path.join(runtimeDir, filename)
    );
  }
}

function main() {
  const whatsappVersion = require(
    path.join(projectRoot, "node_modules", "whatsapp-web.js", "package.json")
  ).version;

  fs.rmSync(runtimeDir, { recursive: true, force: true });
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.writeFileSync(path.join(runtimeDir, ".gitkeep"), "");
  fs.writeFileSync(runtimePackagePath, JSON.stringify({
    name: "upload-iasd-whatsapp-runtime",
    private: true,
    version: rootPackage.version,
    dependencies: { "whatsapp-web.js": whatsappVersion },
  }, null, 2));
  copyRuntimeSources();

  const browserDir = path.join(runtimeDir, "browser");
  const installEnvironment = {
    PUPPETEER_SKIP_DOWNLOAD: "true",
    PUPPETEER_CACHE_DIR: browserDir,
  };
  runNpm(["install", "--omit=dev", "--no-audit", "--no-fund"], {
    env: installEnvironment,
  });
  runNpm(["audit", "--omit=dev", "--audit-level=high"], {
    env: installEnvironment,
  });
  runNpm(["exec", "--", "puppeteer", "browsers", "install", "chrome"], {
    env: installEnvironment,
  });

  const browserPath = findBrowserExecutable(browserDir);
  if (!browserPath) throw new Error("Chromium não foi localizado após a instalação");

  const manifest = {
    platform: process.platform,
    architecture: process.arch,
    appVersion: rootPackage.version,
    whatsappVersion,
    node: path.relative(runtimeDir, nodeTarget).replaceAll("\\", "/"),
    browser: path.relative(runtimeDir, browserPath).replaceAll("\\", "/"),
    script: "whatsapp-bot.cjs",
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("Runtime do WhatsApp preparado em " + runtimeDir);
}

main();
