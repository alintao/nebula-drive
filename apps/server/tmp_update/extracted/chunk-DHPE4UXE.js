// src/config.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
function intEnv(name, dft) {
  const v = process.env[name];
  if (!v) return dft;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : dft;
}
var projectRoot = process.cwd();
var port = intEnv("PORT", 8080);
function loadJwtSecret(dataDir) {
  const f = path.join(dataDir, ".jwt-secret");
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8").trim();
  const secret = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(f, secret, { mode: 384 });
  return secret;
}
var config = {
  port,
  host: process.env.HOST || "0.0.0.0",
  dataDir: process.env.DATA_DIR || path.join(projectRoot, "data"),
  storageRoot: process.env.STORAGE_ROOT || path.join(projectRoot, "storage"),
  appName: process.env.APP_NAME || "NebulaDrive \u661F\u4E91\u7F51\u76D8",
  appUrl: process.env.APP_URL || `http://localhost:${port}`,
  uploadChunkSize: intEnv("UPLOAD_CHUNK_SIZE", 5 * 1024 * 1024)
};
var dirs = {
  data: config.dataDir,
  db: path.join(config.dataDir, "nebula.db"),
  uploads: path.join(config.dataDir, "uploads"),
  recycle: path.join(config.dataDir, "recycle"),
  storageRoot: config.storageRoot,
  backgrounds: path.join(config.dataDir, "backgrounds"),
  jwtSecretFile: path.join(config.dataDir, ".jwt-secret")
};
function ensureDirs() {
  for (const d of [dirs.data, dirs.uploads, dirs.recycle, dirs.storageRoot, dirs.backgrounds]) {
    fs.mkdirSync(d, { recursive: true });
  }
}
var jwtSecret = "";
function initJwtSecret() {
  jwtSecret = process.env.JWT_SECRET || loadJwtSecret(dirs.data);
}

export {
  config,
  dirs,
  ensureDirs,
  jwtSecret,
  initJwtSecret
};
