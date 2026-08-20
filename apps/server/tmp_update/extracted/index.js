import {
  getDb
} from "./chunk-AMECQWS3.js";
import {
  config,
  dirs,
  ensureDirs,
  initJwtSecret,
  jwtSecret
} from "./chunk-DHPE4UXE.js";

// src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fstatic from "@fastify/static";
import fs10 from "node:fs";
import path9 from "node:path";
import { fileURLToPath } from "node:url";

// src/services/user.service.ts
import crypto2 from "node:crypto";

// src/auth/password.ts
import crypto from "node:crypto";
function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, s, 64);
  return `${s}:${derived.toString("hex")}`;
}
function verifyPassword(password, stored) {
  const [s, hash] = stored.split(":");
  if (!s || !hash) return false;
  const derived = crypto.scryptSync(password, s, 64);
  const a = Buffer.from(hash, "hex");
  const b = derived;
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// src/services/user.service.ts
function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    displayName: u.display_name,
    quota: u.quota,
    status: u.status,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at
  };
}
function seedAdmin() {
  const db = getDb();
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count === 0) {
    db.prepare(
      "INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)"
    ).run("admin", hashPassword("admin123"), "admin", "\u7BA1\u7406\u5458");
    console.log("[seed] \u5DF2\u521B\u5EFA\u9ED8\u8BA4\u7BA1\u7406\u5458 admin / admin123\uFF08\u8BF7\u5C3D\u5FEB\u4FEE\u6539\u5BC6\u7801\uFF09");
  }
}
function findByUsername(username) {
  return getDb().prepare("SELECT * FROM users WHERE username = ?").get(username);
}
function findById(id) {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id);
}
function verifyLogin(username, password) {
  const u = findByUsername(username);
  if (!u) return null;
  if (!verifyPassword(password, u.password_hash)) return null;
  if (u.status !== "active") return null;
  return u;
}
function listUsers() {
  return getDb().prepare("SELECT * FROM users ORDER BY id").all();
}
function createUser(username, password, role, displayName = "", quota = 0) {
  const db = getDb();
  const info = db.prepare(
    "INSERT INTO users (username, password_hash, role, display_name, quota) VALUES (?, ?, ?, ?, ?)"
  ).run(username, hashPassword(password), role, displayName, quota);
  return findById(Number(info.lastInsertRowid));
}
function updateUser(id, patch) {
  const db = getDb();
  const u = findById(id);
  if (!u) throw new Error("\u7528\u6237\u4E0D\u5B58\u5728");
  db.prepare(
    `UPDATE users SET
       password_hash = ?, role = ?, display_name = ?, quota = ?, status = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    patch.password ? hashPassword(patch.password) : u.password_hash,
    patch.role || u.role,
    patch.displayName ?? u.display_name,
    patch.quota ?? u.quota,
    patch.status || u.status,
    id
  );
}
function deleteUser(id) {
  getDb().prepare("DELETE FROM users WHERE id = ?").run(id);
}
function touchLogin(id, ip, ua, success) {
  const db = getDb();
  db.prepare("INSERT INTO login_logs (username, ip, ua, success) VALUES (?, ?, ?, ?)").run(
    findById(id)?.username || "",
    ip,
    ua,
    success ? 1 : 0
  );
  if (success) db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(id);
}
function randomPassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto2.randomBytes(len);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

// src/auth/permissions.ts
var MODULES = [
  { key: "files", label: "\u6587\u4EF6\u7BA1\u7406" },
  { key: "recycle", label: "\u56DE\u6536\u7AD9" },
  { key: "users", label: "\u7528\u6237\u7BA1\u7406" },
  { key: "storages", label: "\u5B58\u50A8\u7BA1\u7406" },
  { key: "sync", label: "\u540C\u6B65\u7BA1\u7406" },
  { key: "settings", label: "\u7CFB\u7EDF\u8BBE\u7F6E" },
  { key: "logs", label: "\u64CD\u4F5C\u65E5\u5FD7" },
  { key: "stats", label: "\u7CFB\u7EDF\u7EDF\u8BA1" }
];
var PERMISSIONS = [
  { key: "files:view", label: "\u67E5\u770B\u6587\u4EF6", module: "files" },
  { key: "files:write", label: "\u6587\u4EF6\u64CD\u4F5C\uFF08\u4E0A\u4F20/\u65B0\u5EFA/\u91CD\u547D\u540D/\u79FB\u52A8/\u590D\u5236\uFF09", module: "files" },
  { key: "files:download", label: "\u4E0B\u8F7D\u6587\u4EF6", module: "files" },
  { key: "files:delete", label: "\u5220\u9664\u6587\u4EF6", module: "files" },
  { key: "files:share", label: "\u521B\u5EFA\u5206\u4EAB", module: "files" },
  { key: "recycle:view", label: "\u67E5\u770B\u56DE\u6536\u7AD9", module: "recycle" },
  { key: "recycle:restore", label: "\u6062\u590D\u6587\u4EF6", module: "recycle" },
  { key: "recycle:purge", label: "\u5F7B\u5E95\u5220\u9664", module: "recycle" },
  { key: "users:view", label: "\u67E5\u770B\u7528\u6237", module: "users" },
  { key: "users:manage", label: "\u7BA1\u7406\u7528\u6237\uFF08\u589E\u5220\u6539/\u91CD\u7F6E\u5BC6\u7801\uFF09", module: "users" },
  { key: "storages:view", label: "\u67E5\u770B\u5B58\u50A8", module: "storages" },
  { key: "storages:manage", label: "\u7BA1\u7406\u5B58\u50A8\uFF08\u589E\u5220\u6539/\u6D4B\u8BD5\uFF09", module: "storages" },
  { key: "sync:view", label: "\u67E5\u770B\u540C\u6B65", module: "sync" },
  { key: "sync:manage", label: "\u7BA1\u7406\u540C\u6B65\uFF08\u589E\u5220\u6539\uFF09", module: "sync" },
  { key: "settings:view", label: "\u67E5\u770B\u8BBE\u7F6E", module: "settings" },
  { key: "settings:manage", label: "\u4FEE\u6539\u8BBE\u7F6E\uFF08\u542B\u80CC\u666F\uFF09", module: "settings" },
  { key: "logs:view", label: "\u67E5\u770B/\u6E05\u9664\u65E5\u5FD7", module: "logs" },
  { key: "stats:view", label: "\u67E5\u770B\u7EDF\u8BA1", module: "stats" }
];
var ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);
var ROLES = [
  { key: "admin", label: "\u8D85\u7EA7\u7BA1\u7406\u5458" },
  { key: "user", label: "\u666E\u901A\u7528\u6237" }
];
var DEFAULT_ROLE_PERMISSIONS = {
  // 超级管理员：全部权限
  admin: ALL_PERMISSION_KEYS.slice(),
  // 普通用户：数据操作权限（文件 + 回收站查看/恢复），无管理端权限
  user: [
    "files:view",
    "files:write",
    "files:download",
    "files:delete",
    "files:share",
    "recycle:view",
    "recycle:restore"
  ]
};

// src/services/role.service.ts
function getRolePermissions(role) {
  const rows = getDb().prepare("SELECT permission FROM role_permissions WHERE role = ?").all(role);
  if (rows.length === 0) return DEFAULT_ROLE_PERMISSIONS[role] || [];
  return rows.map((r) => r.permission);
}
function setRolePermissions(role, keys) {
  const db = getDb();
  const valid = keys.filter((k) => ALL_PERMISSION_KEYS.includes(k));
  db.prepare("DELETE FROM role_permissions WHERE role = ?").run(role);
  const stmt = db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission) VALUES (?, ?)");
  for (const k of valid) stmt.run(role, k);
}
function ensureRolePermissions() {
  const db = getDb();
  for (const role of ROLES.map((r) => r.key)) {
    const count = db.prepare("SELECT COUNT(*) AS c FROM role_permissions WHERE role = ?").get(role).c;
    if (count === 0) {
      setRolePermissions(role, DEFAULT_ROLE_PERMISSIONS[role] || []);
    }
  }
}
function getUserPermissions(role) {
  return getRolePermissions(role);
}

// src/auth/jwt.ts
import crypto3 from "node:crypto";
function b64url(d) {
  return Buffer.from(typeof d === "string" ? d : JSON.stringify(d)).toString("base64url");
}
function signJwt(payload, secret, ttlSec = 7 * 86400) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1e3);
  const body = { ...payload, iat: now, exp: now + ttlSec };
  const h = b64url(header);
  const p = b64url(body);
  const sig = crypto3.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  return `${h}.${p}.${sig}`;
}
function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const expect = crypto3.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto3.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1e3)) return null;
    return payload;
  } catch {
    return null;
  }
}

// src/auth/middleware.ts
async function authMiddleware(req2, reply) {
  const header = req2.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return reply.code(401).send({ error: "\u672A\u767B\u5F55" });
  const payload = verifyJwt(token, jwtSecret);
  if (!payload) return reply.code(401).send({ error: "\u767B\u5F55\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55" });
  req2.user = payload;
}
function requirePermission(key) {
  return async (req2, reply) => {
    await authMiddleware(req2, reply);
    if (reply.sent) return;
    const role = req2.user?.role;
    if (!role) return reply.code(403).send({ error: "\u65E0\u6743\u9650" });
    const perms = getRolePermissions(role);
    if (!perms.includes(key)) {
      return reply.code(403).send({ error: "\u65E0\u6743\u9650\u6267\u884C\u6B64\u64CD\u4F5C" });
    }
  };
}
function ok(reply, data) {
  return reply.send({ data });
}
function fail(reply, code, error, extra) {
  return reply.code(code).send({ error, ...extra || {} });
}

// src/services/profile.service.ts
var profileService = {
  get(userId) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId);
    if (!row) return { user_id: userId, avatar: "", email: "", bio: "", phone: "" };
    return row;
  },
  update(userId, fields) {
    const db = getDb();
    const current = this.get(userId);
    const next = {
      avatar: fields.avatar ?? current.avatar,
      email: fields.email ?? current.email,
      bio: fields.bio ?? current.bio,
      phone: fields.phone ?? current.phone
    };
    db.prepare(
      "INSERT INTO user_profiles (user_id, avatar, email, bio, phone, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(user_id) DO UPDATE SET avatar = ?, email = ?, bio = ?, phone = ?, updated_at = datetime('now')"
    ).run(userId, next.avatar, next.email, next.bio, next.phone, next.avatar, next.email, next.bio, next.phone);
    return this.get(userId);
  }
};

// src/services/settings.service.ts
var DEFAULTS = {
  appName: "NebulaDrive \u661F\u4E91\u7F51\u76D8",
  logo: "",
  notice: "",
  registerEnabled: "true",
  uploadChunkSize: "5242880",
  copyright: "",
  aboutText: "",
  contactEmail: "",
  minPasswordLen: "8",
  sessionTimeoutHours: "168",
  maxFileSizeGB: "0",
  shareDefaultExpireDays: "0",
  recycleRetentionDays: "0",
  brandColor: "",
  theme: "light-glass",
  bgType: "theme",
  bgImage: "",
  bgGradientFrom: "",
  bgGradientTo: "",
  bgGradientAngle: "135",
  bgColor: "",
  bgOverlay: "40",
  loginCaptchaThreshold: "3"
};
function getSetting(key) {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : null;
}
function settingNum(key, def) {
  const v = getSetting(key);
  if (v === null || v === "") return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
function setSetting(key, value) {
  getDb().prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}
function getAllSettings() {
  const out = { ...DEFAULTS };
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  for (const r of rows) out[r.key] = r.value;
  return out;
}
function publicSettings() {
  const all = getAllSettings();
  return {
    appName: all.appName,
    logo: all.logo,
    notice: all.notice,
    registerEnabled: all.registerEnabled === "true",
    uploadChunkSize: all.uploadChunkSize,
    copyright: all.copyright,
    aboutText: all.aboutText,
    contactEmail: all.contactEmail,
    minPasswordLen: settingNum("minPasswordLen", 8),
    maxFileSizeGB: settingNum("maxFileSizeGB", 0),
    shareDefaultExpireDays: settingNum("shareDefaultExpireDays", 0),
    brandColor: all.brandColor,
    theme: all.theme || "light-glass",
    bgType: all.bgType || "theme",
    bgImage: all.bgImage,
    bgGradientFrom: all.bgGradientFrom,
    bgGradientTo: all.bgGradientTo,
    bgGradientAngle: settingNum("bgGradientAngle", 135),
    bgColor: all.bgColor,
    bgOverlay: settingNum("bgOverlay", 40)
  };
}

// src/services/captcha.service.ts
import crypto4 from "node:crypto";
var loginAttempts = /* @__PURE__ */ new Map();
var captchaStore = /* @__PURE__ */ new Map();
function generateCaptchaId() {
  return crypto4.randomBytes(16).toString("hex");
}
function generateCaptchaCode() {
  return String(Math.floor(1e3 + Math.random() * 9e3));
}
function createCaptcha() {
  const id = generateCaptchaId();
  const code = generateCaptchaCode();
  captchaStore.set(id, { code, expires: Date.now() + 5 * 60 * 1e3 });
  return { id, code };
}
function verifyCaptcha(id, code) {
  const entry = captchaStore.get(id);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    captchaStore.delete(id);
    return false;
  }
  if (entry.code !== code) return false;
  captchaStore.delete(id);
  return true;
}
function recordLoginFailure(username) {
  const key = username.toLowerCase();
  const entry = loginAttempts.get(key);
  const count = (entry?.count || 0) + 1;
  loginAttempts.set(key, { count, lastAttempt: Date.now() });
  return count;
}
function clearLoginFailures(username) {
  loginAttempts.delete(username.toLowerCase());
}
function getFailureCount(username) {
  return loginAttempts.get(username.toLowerCase())?.count || 0;
}

// src/routes/auth.routes.ts
async function authRoutes(app) {
  app.get("/auth/captcha", async (_req, reply) => {
    const { id, code } = createCaptcha();
    return ok(reply, { id, code });
  });
  app.post("/auth/login", async (req2, reply) => {
    const { username, password, captchaId, captchaCode } = req2.body || {};
    if (!username || !password) return fail(reply, 400, "\u8BF7\u8F93\u5165\u7528\u6237\u540D\u548C\u5BC6\u7801");
    const threshold = settingNum("loginCaptchaThreshold", 3);
    const failCount = getFailureCount(username);
    if (threshold > 0 && failCount >= threshold) {
      if (!captchaId || !captchaCode) {
        return fail(reply, 401, "\u9700\u8981\u9A8C\u8BC1\u7801", { requireCaptcha: true });
      }
      if (!verifyCaptcha(captchaId, captchaCode)) {
        return fail(reply, 401, "\u9A8C\u8BC1\u7801\u9519\u8BEF", { requireCaptcha: true });
      }
    }
    const ip = req2.ip;
    const ua = String(req2.headers["user-agent"] || "");
    const u = verifyLogin(username, password);
    if (!u) {
      const count = recordLoginFailure(username);
      touchLogin(0, ip, ua, false);
      const needCaptcha = threshold > 0 && count >= threshold;
      return fail(reply, 401, "\u7528\u6237\u540D\u6216\u5BC6\u7801\u9519\u8BEF", { requireCaptcha: needCaptcha, failCount: count });
    }
    clearLoginFailures(username);
    touchLogin(u.id, ip, ua, true);
    const ttlSec = settingNum("sessionTimeoutHours", 168) * 3600;
    const token = signJwt({ sub: u.id, username: u.username, role: u.role }, jwtSecret, ttlSec);
    const profile = profileService.get(u.id);
    return ok(reply, { token, user: { ...publicUser(u), avatar: profile.avatar || "", permissions: getUserPermissions(u.role) } });
  });
  app.post("/auth/logout", { preHandler: authMiddleware }, async (req2, reply) => {
    return ok(reply, { ok: true });
  });
  app.get("/auth/me", { preHandler: authMiddleware }, async (req2, reply) => {
    const u = findById(req2.user.sub);
    if (!u) return fail(reply, 401, "\u7528\u6237\u4E0D\u5B58\u5728");
    const profile = profileService.get(u.id);
    return ok(reply, { ...publicUser(u), avatar: profile.avatar || "", permissions: getUserPermissions(u.role) });
  });
  app.post("/auth/register", async (req2, reply) => {
    if (getSetting("registerEnabled") === "false") return fail(reply, 403, "\u6CE8\u518C\u5DF2\u5173\u95ED");
    const { username, password, displayName } = req2.body || {};
    if (!username || !password) return fail(reply, 400, "\u8BF7\u8F93\u5165\u7528\u6237\u540D\u548C\u5BC6\u7801");
    if (username.length < 3 || username.length > 32) return fail(reply, 400, "\u7528\u6237\u540D\u957F\u5EA6 3-32");
    const minLen = settingNum("minPasswordLen", 8);
    if (password.length < minLen) return fail(reply, 400, `\u5BC6\u7801\u81F3\u5C11 ${minLen} \u4F4D`);
    try {
      const u = createUser(username, password, "user", displayName || "", 0);
      const ttlSec = settingNum("sessionTimeoutHours", 168) * 3600;
      const token = signJwt({ sub: u.id, username: u.username, role: u.role }, jwtSecret, ttlSec);
      return ok(reply, { token, user: publicUser(u) });
    } catch (e) {
      return fail(reply, 409, e?.message?.includes("UNIQUE") ? "\u7528\u6237\u540D\u5DF2\u5B58\u5728" : "\u6CE8\u518C\u5931\u8D25");
    }
  });
}

// src/services/file.service.ts
import crypto6 from "node:crypto";

// src/storage/local.ts
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
function toEntry(root, full, name, isDir, size, mtimeMs) {
  const rel = "/" + path.relative(root, full).split(path.sep).join("/");
  return { name, path: rel, isDir, size, mtime: mtimeMs };
}
var LocalDriver = class {
  storageId;
  name;
  type = "local";
  root;
  constructor(storageId, name, root) {
    this.storageId = storageId;
    this.name = name;
    this.root = path.resolve(root);
  }
  /** 防止路径越界：resolve 后必须仍位于 root 内 */
  resolveRel(relPath) {
    const cleaned = (relPath || "/").replace(/\\/g, "/");
    const full = path.resolve(this.root, "." + (cleaned.startsWith("/") ? cleaned : "/" + cleaned));
    if (full !== this.root && !full.startsWith(this.root + path.sep)) {
      throw new Error("\u975E\u6CD5\u8DEF\u5F84");
    }
    return full;
  }
  relToFull(rel) {
    return this.resolveRel(rel);
  }
  async list(dirPath) {
    const full = this.relToFull(dirPath);
    const items = await fsp.readdir(full, { withFileTypes: true });
    const out = [];
    for (const it of items) {
      const st = await fsp.stat(this.relToFull(dirPath) + "/" + it.name).catch(() => null);
      if (!st) continue;
      out.push(toEntry(this.root, this.relToFull(dirPath) + "/" + it.name, it.name, it.isDirectory(), st.size, st.mtimeMs));
    }
    return out;
  }
  async stat(filePath) {
    try {
      const full = this.relToFull(filePath);
      const st = await fsp.stat(full);
      return toEntry(this.root, full, path.basename(full), st.isDirectory(), st.size, st.mtimeMs);
    } catch {
      return null;
    }
  }
  async mkdir(dirPath) {
    await fsp.mkdir(this.relToFull(dirPath), { recursive: true });
  }
  async upload(destPath, src) {
    const full = this.relToFull(destPath);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    const ws = fs.createWriteStream(full);
    await new Promise((res, rej) => {
      src.pipe(ws);
      src.on("error", rej);
      ws.on("finish", () => res());
      ws.on("error", rej);
    });
  }
  async download(filePath, range) {
    const full = this.relToFull(filePath);
    if (range) return fs.createReadStream(full, { start: range.start, end: range.end });
    return fs.createReadStream(full);
  }
  async rename(oldPath, newPath) {
    await fsp.rename(this.relToFull(oldPath), this.relToFull(newPath));
  }
  async copy(srcPath, destPath) {
    const s = this.relToFull(srcPath);
    const d = this.relToFull(destPath);
    const st = await fsp.stat(s);
    if (st.isDirectory()) {
      await fsp.cp(s, d, { recursive: true });
    } else {
      await fsp.mkdir(path.dirname(d), { recursive: true });
      await fsp.copyFile(s, d);
    }
  }
  async move(srcPath, destPath) {
    const s = this.relToFull(srcPath);
    const d = this.relToFull(destPath);
    const st = await fsp.stat(s);
    if (st.isDirectory()) {
      await fsp.cp(s, d, { recursive: true, force: true });
      await fsp.rm(s, { recursive: true, force: true });
    } else {
      await fsp.mkdir(path.dirname(d), { recursive: true });
      await fsp.rename(s, d);
    }
  }
  async delete(filePath, recursive) {
    await fsp.rm(this.relToFull(filePath), { recursive, force: true });
  }
  async search(query, root) {
    const q = query.toLowerCase();
    const out = [];
    const walk = async (full, rel) => {
      const items = await fsp.readdir(full, { withFileTypes: true }).catch(() => []);
      for (const it of items) {
        const f = path.join(full, it.name);
        const r = rel + "/" + it.name;
        let st = null;
        try {
          st = await fsp.stat(f);
        } catch {
          continue;
        }
        if (it.isDirectory()) {
          if (it.name.toLowerCase().includes(q)) out.push(toEntry(this.root, f, it.name, true, 0, st.mtimeMs));
          await walk(f, r);
        } else if (it.name.toLowerCase().includes(q)) {
          out.push(toEntry(this.root, f, it.name, false, st.size, st.mtimeMs));
        }
      }
    };
    await walk(this.relToFull(root), root === "/" ? "" : root.replace(/\/$/, ""));
    return out;
  }
  async test() {
    await fsp.mkdir(this.root, { recursive: true });
    const probe = path.join(this.root, `.probe_${Date.now()}`);
    await fsp.writeFile(probe, "ok");
    await fsp.rm(probe);
  }
  /** 递归计算存储总用量 */
  async usage() {
    let used = 0;
    let files = 0;
    const walk = async (dir) => {
      const items = await fsp.readdir(dir, { withFileTypes: true });
      for (const it of items) {
        const full = path.join(dir, it.name);
        if (it.isDirectory()) {
          await walk(full);
        } else if (it.isFile()) {
          const st = await fsp.stat(full).catch(() => null);
          if (st) {
            used += st.size;
            files++;
          }
        }
      }
    };
    await walk(this.root);
    return { used, files };
  }
};

// src/storage/webdav.ts
import { Readable } from "node:stream";
function parsePropfind(xml, baseUrl) {
  const out = [];
  const re = /<d:response>([\s\S]*?)<\/d:response>/g;
  let m;
  while (m = re.exec(xml)) {
    const block = m[1];
    const hrefM = block.match(/<d:href>(.*?)<\/d:href>/);
    if (!hrefM) continue;
    let href = decodeURIComponent(hrefM[1]);
    const isDir = /<d:collection>\s*1\s*<\/d:collection>/.test(block);
    const sizeM = block.match(/<d:getcontentlength>[\s\S]*?<v1:href>([\s\S]*?)<\/v1:href>[\s\S]*?<\/d:getcontentlength>/);
    const size = sizeM ? parseInt(sizeM[1], 10) || 0 : 0;
    const modM = block.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/);
    const mtime = modM ? Date.parse(modM[1]) || 0 : 0;
    let rel = href;
    if (baseUrl && href.startsWith(baseUrl)) rel = href.slice(baseUrl.length) || "/";
    if (rel === baseUrl || rel === "") continue;
    const name = decodeURIComponent(rel.split("/").filter(Boolean).pop() || "");
    const clean = "/" + rel.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean).join("/");
    if (!name) continue;
    out.push({
      name,
      path: clean + (isDir ? "/" : ""),
      isDir,
      size: isDir ? 0 : size,
      mtime
    });
  }
  return out;
}
var WebDavDriver = class {
  storageId;
  name;
  type = "webdav";
  url;
  username;
  password;
  baseDir;
  constructor(storageId, name, cfg) {
    this.storageId = storageId;
    this.name = name;
    this.url = cfg.url.replace(/\/$/, "");
    this.username = cfg.username;
    this.password = cfg.password;
    this.baseDir = (cfg.baseDir || "/").replace(/\/$/, "");
  }
  abs(relPath) {
    const p = (this.baseDir || "") + (relPath.startsWith("/") ? relPath : "/" + relPath);
    return this.url + (p === "/" ? "" : p);
  }
  headers(extra = {}) {
    const h = { ...extra };
    if (this.username) h["Authorization"] = "Basic " + Buffer.from(`${this.username}:${this.password || ""}`).toString("base64");
    return h;
  }
  async list(dirPath) {
    const res = await fetch(this.abs(dirPath), {
      method: "PROPFIND",
      headers: this.headers({ Depth: "1", "Content-Type": "application/xml" }),
      body: `<?xml version="1.0"?><propfind xmlns="DAV:"><propfilestatustemplate xmlns="DAV:"></propfilestatustemplate><prop><getlastmodified/><getcontentlength/><resourcetype/></prop></propfind>`
    });
    const xml = await res.text();
    return parsePropfind(xml, this.abs("/"));
  }
  async stat(filePath) {
    const res = await fetch(this.abs(filePath), {
      method: "PROPFIND",
      headers: this.headers({ Depth: "0", "Content-Type": "application/xml" }),
      body: `<?xml version="1.0"?><propfind xmlns="DAV:"><prop><getlastmodified/><getcontentlength/><resourcetype/></prop></propfind>`
    });
    if (res.status === 404) return null;
    const xml = await res.text();
    const entries = parsePropfind(xml, this.abs(filePath));
    const st = await this.statSelf(filePath);
    return st;
  }
  async statSelf(filePath) {
    const res = await fetch(this.abs(filePath), {
      method: "PROPFIND",
      headers: this.headers({ Depth: "0", "Content-Type": "application/xml" }),
      body: `<?xml version="1.0"?><propfind xmlns="DAV:"><prop><getlastmodified/><getcontentlength/><resourcetype/></prop></propfind>`
    });
    if (res.status === 404) return null;
    const xml = await res.text();
    const re = /<d:response>[\s\S]*?<\/d:response>/;
    const m = re.exec(xml);
    if (!m) return null;
    const block = m[0];
    const isDir = /<d:collection>[\s\S]*?1[\s\S]*?<\/d:collection>/.test(block);
    const sizeM = block.match(/<d:getcontentlength>[\s\S]*?<v1:href>([\s\S]*?)<\/v1:href>/);
    const modM = block.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/);
    return {
      name: filePath.split("/").filter(Boolean).pop() || "/",
      path: filePath,
      isDir,
      size: sizeM ? parseInt(sizeM[1], 10) || 0 : 0,
      mtime: modM ? Date.parse(modM[1]) || 0 : 0
    };
  }
  async mkdir(dirPath) {
    const res = await fetch(this.abs(dirPath), { method: "MKCOL", headers: this.headers() });
    if (res.status !== 405 && !res.ok) throw new Error(`WebDAV mkdir \u5931\u8D25: ${res.status}`);
  }
  async upload(destPath, src) {
    const chunks = [];
    for await (const c of src) chunks.push(Buffer.from(c));
    const body = Buffer.concat(chunks);
    const res = await fetch(this.abs(destPath), {
      method: "PUT",
      headers: this.headers({ "Content-Type": "application/octet-stream" }),
      body
    });
    if (!res.ok) throw new Error(`WebDAV \u4E0A\u4F20\u5931\u8D25: ${res.status}`);
  }
  async download(filePath) {
    const res = await fetch(this.abs(filePath), { headers: this.headers() });
    if (!res.ok || !res.body) throw new Error(`WebDAV \u4E0B\u8F7D\u5931\u8D25: ${res.status}`);
    return Readable.fromWeb(res.body);
  }
  async rename(oldPath, newPath) {
    const res = await fetch(this.abs(oldPath), {
      method: "MOVE",
      headers: this.headers({ Destination: encodeURI(this.abs(newPath)) })
    });
    if (!res.ok) throw new Error(`WebDAV \u91CD\u547D\u540D\u5931\u8D25: ${res.status}`);
  }
  async copy(srcPath, destPath) {
    const res = await fetch(this.abs(srcPath), {
      method: "COPY",
      headers: this.headers({ Destination: encodeURI(this.abs(destPath)) })
    });
    if (!res.ok) throw new Error(`WebDAV \u590D\u5236\u5931\u8D25: ${res.status}`);
  }
  async move(srcPath, destPath) {
    await this.rename(srcPath, destPath);
  }
  async delete(filePath, _recursive) {
    const res = await fetch(this.abs(filePath), { method: "DELETE", headers: this.headers() });
    if (!res.ok && res.status !== 404) throw new Error(`WebDAV \u5220\u9664\u5931\u8D25: ${res.status}`);
  }
  async search(query, root) {
    const q = query.toLowerCase();
    const out = [];
    const walk = async (p) => {
      const entries = await this.list(p);
      for (const e of entries) {
        if (e.name.toLowerCase().includes(q)) out.push(e);
        if (e.isDir) await walk(e.path);
      }
    };
    await walk(root);
    return out;
  }
  async test() {
    await this.list("/");
  }
};

// src/storage/s3.ts
import { Readable as Readable2 } from "node:stream";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";
var S3Driver = class {
  storageId;
  name;
  type = "s3";
  client;
  bucket;
  prefix;
  constructor(storageId, name, cfg) {
    this.storageId = storageId;
    this.name = name;
    this.bucket = cfg.bucket;
    this.prefix = (cfg.prefix || "").replace(/\/+$/, "");
    this.client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      forcePathStyle: cfg.forcePathStyle ?? true
    });
  }
  key(relPath) {
    const p = (this.prefix ? this.prefix + "/" : "") + relPath.replace(/^\//, "");
    return p;
  }
  toEntry(key, size, lastModified, isDir) {
    const rel = "/" + key.replace(this.prefix ? this.prefix + "/" : "", "").replace(/^\//, "");
    const name = key.split("/").filter(Boolean).pop() || "/";
    return {
      name,
      path: rel + (isDir ? "/" : ""),
      isDir,
      size,
      mtime: lastModified?.getTime() || 0
    };
  }
  async list(dirPath) {
    const prefix = this.key(dirPath) + (dirPath === "/" ? "" : "/");
    const out = [];
    let cont;
    for (; ; ) {
      const res = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, Delimiter: "/", ContinuationToken: cont })
      );
      for (const p of res.CommonPrefixes || []) {
        const cp = p.Prefix;
        const rel = "/" + cp.replace(this.prefix ? this.prefix + "/" : "", "").replace(/^\//, "");
        out.push({ name: cp.split("/").filter(Boolean).pop() || "", path: rel + "/", isDir: true, size: 0, mtime: 0 });
      }
      for (const o of res.Contents || []) {
        if (!o.Key || o.Key.endsWith("/")) continue;
        const rel = "/" + o.Key.replace(this.prefix ? this.prefix + "/" : "", "").replace(/^\//, "");
        out.push({
          name: o.Key.split("/").filter(Boolean).pop() || "",
          path: rel,
          isDir: false,
          size: o.Size || 0,
          mtime: o.LastModified?.getTime() || 0
        });
      }
      if (res.IsTruncated) cont = res.NextContinuationToken;
      else break;
    }
    return out;
  }
  async stat(filePath) {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(filePath) }));
      return this.toEntry(this.key(filePath), res.ContentLength || 0, res.LastModified, false);
    } catch {
      return null;
    }
  }
  async mkdir(_dirPath) {
    const key = this.key(_dirPath) + "/";
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: "" }));
  }
  async upload(destPath, src) {
    const chunks = [];
    for await (const c of src) chunks.push(Buffer.from(c));
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: this.key(destPath), Body: Buffer.concat(chunks) })
    );
  }
  async download(filePath) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key(filePath) }));
    return Readable2.fromWeb(res.Body);
  }
  async rename(oldPath, newPath) {
    await this.client.send(
      new CopyObjectCommand({ Bucket: this.bucket, CopySource: `${this.bucket}/${this.key(oldPath)}`, Key: this.key(newPath) })
    );
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(oldPath) }));
  }
  async copy(srcPath, destPath) {
    await this.client.send(
      new CopyObjectCommand({ Bucket: this.bucket, CopySource: `${this.bucket}/${this.key(srcPath)}`, Key: this.key(destPath) })
    );
  }
  async move(srcPath, destPath) {
    await this.rename(srcPath, destPath);
  }
  async delete(filePath, _recursive) {
    const prefix = this.key(filePath) + (filePath.endsWith("/") ? "" : "/");
    let cont;
    for (; ; ) {
      const res = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: cont })
      );
      const keys = (res.Contents || []).map((o) => ({ Key: o.Key }));
      if (keys.length) {
        await this.client.send(new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }));
      }
      if (res.IsTruncated) cont = res.NextContinuationToken;
      else break;
    }
  }
  async search(query, root) {
    const q = query.toLowerCase();
    const prefix = this.key(root) + (root === "/" ? "" : "/");
    const out = [];
    let cont;
    for (; ; ) {
      const res = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: cont })
      );
      for (const o of res.Contents || []) {
        if (o.Key && o.Key.split("/").pop().toLowerCase().includes(q)) {
          out.push(this.toEntry(o.Key, o.Size || 0, o.LastModified, false));
        }
      }
      if (res.IsTruncated) cont = res.NextContinuationToken;
      else break;
    }
    return out;
  }
  async test() {
    await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, MaxKeys: 1 }));
  }
};

// src/storage/onedrive.ts
import { Readable as Readable3 } from "node:stream";
var OneDriveDriver = class {
  storageId;
  name;
  type = "onedrive";
  clientId;
  clientSecret;
  tenantId;
  driveId;
  token = null;
  tokenExp = 0;
  constructor(storageId, name, cfg) {
    this.storageId = storageId;
    this.name = name;
    this.clientId = cfg.clientId;
    this.clientSecret = cfg.clientSecret;
    this.tenantId = cfg.tenantId || "common";
    this.driveId = cfg.driveId || "root";
  }
  async tokenUrl() {
    if (this.token && Date.now() < this.tokenExp - 6e4) return this.token;
    const res = await fetch(`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: "https://api.microsoftonline.com/v3.5/files"
      })
    });
    if (!res.ok) throw new Error(`OneDrive \u83B7\u53D6\u4EE4\u724C\u5931\u8D25: ${res.status}`);
    const data = await res.json();
    this.token = data.access_token;
    this.tokenExp = Date.now() + data.expires_in * 1e3;
    return data.access_token;
  }
  async api(path10, init = {}) {
    const t = await this.tokenUrl();
    return fetch(`https://graph.microsoft.com/v1.0/drives/${this.driveId}${path10}`, {
      ...init,
      headers: { Authorization: `Bearer ${t}`, ...init.headers || {} }
    });
  }
  itemPath(relPath) {
    const p = relPath.replace(/^\//, "").replace(/\/$/, "");
    return p ? `:/${p}` : ":root";
  }
  toEntry(item) {
    const isDir = !!item.folder;
    const name = item.name || "";
    const rel = item.parentPath ? item.parentPath + "/" + name : name;
    return {
      name,
      path: "/" + rel + (isDir ? "/" : ""),
      isDir,
      size: item.size || 0,
      mtime: Date.parse(item.lastModifiedDate || "") || 0
    };
  }
  async list(dirPath) {
    const res = await this.api(`${this.itemPath(dirPath)}:children?select=name,folder,size,lastModifiedDate,parentPath`);
    if (!res.ok) throw new Error(`OneDrive \u5217\u76EE\u5F55\u5931\u8D25: ${res.status}`);
    const data = await res.json();
    return (data.value || []).map((v) => this.toEntry(v));
  }
  async stat(filePath) {
    const res = await this.api(`${this.itemPath(filePath)}:select=name,folder,size,lastModifiedDate,parentPath`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const data = await res.json();
    return this.toEntry(data);
  }
  async mkdir(dirPath) {
    const parts = dirPath.split("/").filter(Boolean);
    let cur = ":root";
    for (const p of parts) {
      const res = await this.api(`${cur}:children?select=id`);
      if (res.ok) {
        const data = await res.json();
        const found = (data.value || []).find((v) => v.name === p && v.folder);
        if (found) {
          cur = `:${found.id}`;
          continue;
        }
      }
      const mk = await this.api(`${cur}:children`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: p, folder: {}, "@microsoft.graph.conflictBehavior": "rename" })
      });
      if (!mk.ok) throw new Error(`OneDrive \u5EFA\u76EE\u5F55\u5931\u8D25: ${mk.status}`);
      const created = await mk.json();
      cur = `:${created.id}`;
    }
  }
  async upload(destPath, src) {
    const chunks = [];
    for await (const c of src) chunks.push(Buffer.from(c));
    const name = destPath.split("/").filter(Boolean).pop() || "file";
    const parent = destPath.replace(/\/[^/]+$/, "") || "/";
    const res = await this.api(`${this.itemPath(parent)}:children:${name}:/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream" },
      body: Buffer.concat(chunks)
    });
    if (!res.ok) throw new Error(`OneDrive \u4E0A\u4F20\u5931\u8D25: ${res.status}`);
  }
  async download(filePath) {
    const res = await this.api(`${this.itemPath(filePath)}:/content`);
    if (!res.ok || !res.body) throw new Error(`OneDrive \u4E0B\u8F7D\u5931\u8D25: ${res.status}`);
    return Readable3.fromWeb(res.body);
  }
  async rename(oldPath, newPath) {
    const newName = newPath.split("/").filter(Boolean).pop() || "";
    const res = await this.api(this.itemPath(oldPath), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName })
    });
    if (!res.ok) throw new Error(`OneDrive \u91CD\u547D\u540D\u5931\u8D25: ${res.status}`);
  }
  async copy(srcPath, destPath) {
    const newName = destPath.split("/").filter(Boolean).pop() || "";
    const parent = destPath.replace(/\/[^/]+$/, "") || "/";
    const res = await this.api(`${this.itemPath(srcPath)}:copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, destinationId: this.itemPath(parent).replace(/:root/, ":root:/") })
    });
    if (!res.ok) throw new Error(`OneDrive \u590D\u5236\u5931\u8D25: ${res.status}`);
  }
  async move(srcPath, destPath) {
    await this.rename(srcPath, destPath);
  }
  async delete(filePath, _recursive) {
    const res = await this.api(this.itemPath(filePath), { method: "DELETE" });
    if (!res.ok && res.status !== 404) throw new Error(`OneDrive \u5220\u9664\u5931\u8D25: ${res.status}`);
  }
  async search(query, root) {
    const q = query.toLowerCase();
    const out = [];
    const walk = async (p) => {
      const entries = await this.list(p);
      for (const e of entries) {
        if (e.name.toLowerCase().includes(q)) out.push(e);
        if (e.isDir) await walk(e.path);
      }
    };
    await walk(root);
    return out;
  }
  async test() {
    await this.list("/");
  }
};

// src/storage/alist.ts
import { Readable as Readable4 } from "node:stream";
var AlistDriver = class {
  storageId;
  name;
  type = "alist";
  url;
  username;
  password;
  token = null;
  root;
  constructor(storageId, name, cfg) {
    this.storageId = storageId;
    this.name = name;
    this.url = cfg.url.replace(/\/$/, "");
    this.username = cfg.username;
    this.password = cfg.password;
    this.root = (cfg.root || "/").replace(/\/$/, "");
  }
  abs(relPath) {
    const p = (this.root || "") + (relPath.startsWith("/") ? relPath : "/" + relPath);
    return p === "" ? "/" : p;
  }
  async api(path10, init = {}) {
    const res = await fetch(`${this.url}/api${path10}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...this.token ? { "Authorization": this.token } : {},
        ...init.headers || {}
      }
    });
    const data = await res.json();
    if (data.code !== 200) throw new Error(`Alist \u9519\u8BEF: ${data.message || data.code}`);
    return data.data;
  }
  async ensureToken() {
    if (this.token) return;
    const data = await this.api("/login", {
      method: "POST",
      body: JSON.stringify({ username: this.username, password: this.password })
    });
    this.token = data.token;
  }
  toEntry(item) {
    const isDir = !!item.is_dir;
    const name = item.name;
    const parent = item.parent || "/";
    const rel = parent === "/" ? "/" : parent;
    return {
      name,
      path: rel + name + (isDir ? "/" : ""),
      isDir,
      size: item.size || 0,
      mtime: item.created || 0
    };
  }
  async list(dirPath) {
    await this.ensureToken();
    const data = await this.api(`/fs/list?path=${encodeURIComponent(this.abs(dirPath))}&w=&v=1&parent=`);
    return (data.files || []).map((f) => this.toEntry(f));
  }
  async stat(filePath) {
    try {
      await this.ensureToken();
      const data = await this.api(`/fs/get?path=${encodeURIComponent(this.abs(filePath))}&v=1`);
      return this.toEntry(data);
    } catch {
      return null;
    }
  }
  async mkdir(dirPath) {
    await this.ensureToken();
    await this.api(`/fs/mkdir?path=${encodeURIComponent(this.abs(dirPath))}`, { method: "POST" });
  }
  async upload(destPath, src) {
    await this.ensureToken();
    const chunks = [];
    for await (const c of src) chunks.push(Buffer.from(c));
    const name = destPath.split("/").filter(Boolean).pop() || "file";
    const parent = this.abs(destPath.replace(/\/[^/]+$/, "") || "/");
    const res = await fetch(`${this.url}/d${parent === "/" ? "/" : parent}/${name}?_token=${this.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: Buffer.concat(chunks)
    });
    if (!res.ok) throw new Error(`Alist \u4E0A\u4F20\u5931\u8D25: ${res.status}`);
  }
  async download(filePath) {
    await this.ensureToken();
    const res = await fetch(`${this.url}/d${this.abs(filePath)}?_token=${this.token}`);
    if (!res.ok || !res.body) throw new Error(`Alist \u4E0B\u8F7D\u5931\u8D25: ${res.status}`);
    return Readable4.fromWeb(res.body);
  }
  async rename(oldPath, newPath) {
    await this.ensureToken();
    await this.api(`/fs/rename?name=${encodeURIComponent(newPath.split("/").filter(Boolean).pop() || "")}&path=${encodeURIComponent(this.abs(oldPath))}&v=1`, { method: "POST" });
  }
  async copy(srcPath, destPath) {
    await this.ensureToken();
    await this.api(`/fs/copy?src=${encodeURIComponent(this.abs(srcPath))}&dst=${encodeURIComponent(this.abs(destPath))}&v=1`, { method: "POST" });
  }
  async move(srcPath, destPath) {
    await this.ensureToken();
    await this.api(`/fs/move?src=${encodeURIComponent(this.abs(srcPath))}&dst=${encodeURIComponent(this.abs(destPath))}&v=1`, { method: "POST" });
  }
  async delete(filePath, _recursive) {
    await this.ensureToken();
    await this.api(`/fs/delete?path=${encodeURIComponent(this.abs(filePath))}&v=1`, { method: "POST" });
  }
  async search(query, root) {
    const q = query.toLowerCase();
    const out = [];
    const walk = async (p) => {
      const entries = await this.list(p);
      for (const e of entries) {
        if (e.name.toLowerCase().includes(q)) out.push(e);
        if (e.isDir) await walk(e.path);
      }
    };
    await walk(root);
    return out;
  }
  async test() {
    await this.ensureToken();
    await this.list("/");
  }
};

// src/storage/ftp.ts
import { PassThrough, Readable as Readable5, Writable } from "node:stream";
import { Client } from "basic-ftp";
var FtpDriver = class {
  storageId;
  name;
  type = "ftp";
  host;
  port;
  username;
  password;
  baseDir;
  constructor(storageId, name, cfg) {
    this.storageId = storageId;
    this.name = name;
    this.host = cfg.host;
    this.port = cfg.port || 21;
    this.username = cfg.username;
    this.password = cfg.password;
    this.baseDir = (cfg.baseDir || "/").replace(/\/+$/, "");
  }
  abs(relPath) {
    const p = (this.baseDir || "") + (relPath.startsWith("/") ? relPath : "/" + relPath);
    return p === "" ? "/" : p;
  }
  accessOptions() {
    return { host: this.host, port: this.port, user: this.username, password: this.password, secure: false };
  }
  /** 创建客户端并完成连接，操作完成后统一关闭 */
  withClient(fn) {
    const c = new Client(3e4);
    return c.access(this.accessOptions()).then(() => fn(c)).finally(() => c.close());
  }
  toEntry(name, path10, isDir, size, mtime) {
    const clean = "/" + path10.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean).join("/");
    return { name, path: clean + (isDir ? "/" : ""), isDir, size, mtime };
  }
  async list(dirPath) {
    return this.withClient(async (c) => {
      await c.ensureDir(this.abs(dirPath));
      const items = await c.list(this.abs(dirPath));
      const out = [];
      for (const info of items) {
        if (info.name === "." || info.name === "..") continue;
        out.push(
          this.toEntry(
            info.name,
            this.abs(dirPath) + "/" + info.name,
            info.isDirectory,
            info.size || 0,
            (info.modifiedAt || /* @__PURE__ */ new Date()).getTime()
          )
        );
      }
      return out;
    });
  }
  async stat(filePath) {
    return this.withClient(async (c) => {
      const parent = filePath.replace(/\/[^/]+$/, "") || "/";
      const name = filePath.split("/").filter(Boolean).pop() || "";
      const items = await c.list(this.abs(parent)).catch(() => []);
      const info = items.find((i) => i.name === name);
      if (!info) return null;
      return this.toEntry(info.name, filePath, info.isDirectory, info.size || 0, (info.modifiedAt || /* @__PURE__ */ new Date()).getTime());
    });
  }
  async mkdir(dirPath) {
    await this.withClient(async (c) => {
      await c.ensureDir(this.abs(dirPath));
    });
  }
  async upload(destPath, src) {
    await this.withClient(async (c) => {
      const parent = destPath.replace(/\/[^/]+$/, "") || "/";
      await c.ensureDir(this.abs(parent));
      await c.uploadFrom(src, this.abs(destPath));
    });
  }
  async download(filePath) {
    const c = new Client(3e4);
    const out = new PassThrough();
    c.access(this.accessOptions()).then(() => c.downloadTo(out, this.abs(filePath))).catch((e) => {
      out.destroy(e);
    }).finally(() => c.close());
    return out;
  }
  async rename(oldPath, newPath) {
    await this.withClient(async (c) => {
      await c.rename(this.abs(oldPath), this.abs(newPath));
    });
  }
  async copy(srcPath, destPath) {
    await this.withClient(async (c) => {
      const buf = await collectDownload(c, this.abs(srcPath));
      const parent = destPath.replace(/\/[^/]+$/, "") || "/";
      await c.ensureDir(this.abs(parent));
      await c.uploadFrom(Readable5.from(buf), this.abs(destPath));
    });
  }
  async move(srcPath, destPath) {
    await this.withClient(async (c) => {
      await c.rename(this.abs(srcPath), this.abs(destPath));
    });
  }
  async delete(filePath, recursive) {
    await this.withClient(async (c) => {
      if (recursive) await c.removeDir(this.abs(filePath));
      else await c.remove(this.abs(filePath));
    });
  }
  async search(query, root) {
    const q = query.toLowerCase();
    const out = [];
    const walk = async (p) => {
      const entries = await this.list(p);
      for (const e of entries) {
        if (e.name.toLowerCase().includes(q)) out.push(e);
        if (e.isDir) await walk(e.path);
      }
    };
    await walk(root);
    return out;
  }
  async test() {
    await this.withClient(async (c) => {
      await c.cd(this.baseDir || "/");
    });
  }
};
function collectDownload(c, path10) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(Buffer.from(chunk));
        cb();
      }
    });
    c.downloadTo(sink, path10).then(() => resolve(Buffer.concat(chunks)), reject);
  });
}

// src/storage/registry.ts
var cache = /* @__PURE__ */ new Map();
function createDriver(rec) {
  const raw = rec.config;
  const cfg = typeof raw === "string" ? raw ? JSON.parse(raw) : {} : raw || {};
  switch (rec.type) {
    case "local":
      return new LocalDriver(rec.id, rec.name, String(cfg.root || ""));
    case "webdav":
      return new WebDavDriver(rec.id, rec.name, cfg);
    case "s3":
      return new S3Driver(rec.id, rec.name, cfg);
    case "onedrive":
      return new OneDriveDriver(rec.id, rec.name, cfg);
    case "alist":
      return new AlistDriver(rec.id, rec.name, cfg);
    case "ftp":
      return new FtpDriver(rec.id, rec.name, cfg);
    default:
      throw new Error(`\u672A\u77E5\u5B58\u50A8\u7C7B\u578B: ${rec.type}`);
  }
}
function getDriver(rec) {
  let d = cache.get(rec.id);
  if (!d) {
    d = createDriver(rec);
    cache.set(rec.id, d);
  }
  return d;
}
function invalidateDriver(storageId) {
  cache.delete(storageId);
}
var STORAGE_TYPES = [
  { type: "local", label: "\u672C\u5730\u5B58\u50A8", fields: [
    { key: "root", label: "\u6839\u76EE\u5F55", placeholder: "D:/nebula/storage \u6216 /data/storage" }
  ] },
  { type: "webdav", label: "WebDAV", fields: [
    { key: "url", label: "\u670D\u52A1\u5668\u5730\u5740", placeholder: "https://dav.example.com" },
    { key: "username", label: "\u7528\u6237\u540D" },
    { key: "password", label: "\u5BC6\u7801", secret: true },
    { key: "baseDir", label: "\u5B50\u76EE\u5F55", placeholder: "/ \u6216 /sync" }
  ] },
  { type: "s3", label: "S3 \u517C\u5BB9\u5BF9\u8C61\u5B58\u50A8", fields: [
    { key: "endpoint", label: "Endpoint", placeholder: "https://s3.amazonaws.com \u6216 MinIO \u5730\u5740" },
    { key: "region", label: "Region", placeholder: "us-east-1" },
    { key: "accessKeyId", label: "AccessKey ID" },
    { key: "secretAccessKey", label: "SecretAccessKey", secret: true },
    { key: "bucket", label: "Bucket" },
    { key: "prefix", label: "\u524D\u7F00\u76EE\u5F55", placeholder: "\u53EF\u9009" }
  ] },
  { type: "onedrive", label: "OneDrive", fields: [
    { key: "clientId", label: "Client ID (Azure \u5E94\u7528)" },
    { key: "clientSecret", label: "Client Secret", secret: true },
    { key: "tenantId", label: "Tenant ID", placeholder: "\u4E2A\u4EBA\u7248\u7559\u7A7A" },
    { key: "driveId", label: "Drive ID", placeholder: "\u9ED8\u8BA4 root" }
  ] },
  { type: "alist", label: "Alist", fields: [
    { key: "url", label: "Alist \u5730\u5740", placeholder: "http://127.0.0.1:5244" },
    { key: "username", label: "\u7528\u6237\u540D" },
    { key: "password", label: "\u5BC6\u7801", secret: true },
    { key: "root", label: "\u6839\u76EE\u5F55", placeholder: "/" }
  ] },
  { type: "ftp", label: "FTP", fields: [
    { key: "host", label: "\u4E3B\u673A" },
    { key: "port", label: "\u7AEF\u53E3", placeholder: "21" },
    { key: "username", label: "\u7528\u6237\u540D" },
    { key: "password", label: "\u5BC6\u7801", secret: true },
    { key: "baseDir", label: "\u5B50\u76EE\u5F55", placeholder: "/" }
  ] }
];

// src/services/recycle.service.ts
import crypto5 from "node:crypto";
import fs2 from "node:fs";
import path2 from "node:path";
var recycleService = {
  /**
   * 移入回收站：
   * - local 存储：物理移动到 data/recycle/<uuid>/，可恢复
   * - 远程存储：直接驱动删除，仅保留元数据（恢复需重新上传，此处恢复=报错提示）
   */
  async moveToRecycle(storageId, filePath, userId) {
    const db = getDb();
    const rec = db.prepare("SELECT * FROM storages WHERE id = ?").get(storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728");
    const driver = getDriver(rec);
    const stat = await driver.stat(filePath);
    const name = filePath.split("/").filter(Boolean).pop() || "\u672A\u77E5";
    let localCopy = null;
    if (rec.type === "local") {
      const cfg = typeof rec.config === "string" ? JSON.parse(rec.config || "{}") : rec.config || {};
      const real = path2.join(cfg.root || dirs.storageRoot, filePath);
      const target = path2.join(dirs.recycle, crypto5.randomUUID());
      fs2.mkdirSync(path2.dirname(target), { recursive: true });
      fs2.renameSync(real, target);
      localCopy = target;
    } else {
      await driver.delete(filePath, true);
    }
    db.prepare(
      `INSERT INTO recycle (storage_id, path, name, size, is_dir, local_copy, deleted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(storageId, filePath, name, stat?.size || 0, stat?.isDir ? 1 : 0, localCopy, userId ?? null);
  },
  list() {
    return getDb().prepare("SELECT * FROM recycle ORDER BY id DESC").all();
  },
  restore(id) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM recycle WHERE id = ?").get(id);
    if (!row) throw new Error("\u56DE\u6536\u7AD9\u8BB0\u5F55\u4E0D\u5B58\u5728");
    if (row.local_copy) {
      const rec = db.prepare("SELECT * FROM storages WHERE id = ?").get(row.storage_id);
      const cfg = rec ? typeof rec.config === "string" ? JSON.parse(rec.config || "{}") : rec.config || {} : {};
      const real = path2.join(cfg.root || dirs.storageRoot, row.path);
      fs2.mkdirSync(path2.dirname(real), { recursive: true });
      fs2.renameSync(row.local_copy, real);
    } else {
      throw new Error("\u8FDC\u7A0B\u5B58\u50A8\u9879\u5DF2\u7269\u7406\u5220\u9664\uFF0C\u65E0\u6CD5\u6062\u590D\uFF08\u8BF7\u91CD\u65B0\u4E0A\u4F20\uFF09");
    }
    db.prepare("DELETE FROM recycle WHERE id = ?").run(id);
  },
  remove(id) {
    const row = getDb().prepare("SELECT * FROM recycle WHERE id = ?").get(id);
    if (!row) return;
    if (row.local_copy && fs2.existsSync(row.local_copy)) {
      fs2.rmSync(row.local_copy, { recursive: true, force: true });
    }
    getDb().prepare("DELETE FROM recycle WHERE id = ?").run(id);
  },
  clear() {
    const rows = getDb().prepare("SELECT * FROM recycle").all();
    for (const r of rows) {
      if (r.local_copy && fs2.existsSync(r.local_copy)) {
        fs2.rmSync(r.local_copy, { recursive: true, force: true });
      }
    }
    getDb().prepare("DELETE FROM recycle").run();
  },
  /**
   * 自动清理：删除超过 N 天的回收站条目（物理文件 + 元数据）。
   * 返回清理条数。
   */
  purgeOlderThan(days) {
    if (!Number.isFinite(days) || days <= 0) return 0;
    const db = getDb();
    const cutoff = new Date(Date.now() - days * 864e5).toISOString().replace("T", " ").slice(0, 19);
    const rows = db.prepare("SELECT * FROM recycle WHERE deleted_at < ?").all(cutoff);
    for (const r of rows) {
      if (r.local_copy && fs2.existsSync(r.local_copy)) {
        fs2.rmSync(r.local_copy, { recursive: true, force: true });
      }
    }
    const info = db.prepare("DELETE FROM recycle WHERE deleted_at < ?").run(cutoff);
    return Number(info.changes) || 0;
  }
};

// src/services/log.service.ts
function opLog(userId, username, action, path10, ip, ua) {
  getDb().prepare("INSERT INTO op_logs (user_id, username, action, path, ip, ua) VALUES (?, ?, ?, ?, ?, ?)").run(userId ?? null, username ?? null, action, path10 ?? null, ip ?? null, ua ?? null);
}
function listOpLogs(page, size) {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) AS c FROM op_logs").get().c;
  const rows = db.prepare("SELECT * FROM op_logs ORDER BY id DESC LIMIT ? OFFSET ?").all(size, (page - 1) * size);
  return { total, page, size, rows };
}
function listLoginLogs(page, size) {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) AS c FROM login_logs").get().c;
  const rows = db.prepare("SELECT * FROM login_logs ORDER BY id DESC LIMIT ? OFFSET ?").all(size, (page - 1) * size);
  return { total, page, size, rows };
}
function clearLogs() {
  getDb().prepare("DELETE FROM op_logs").run();
  getDb().prepare("DELETE FROM login_logs").run();
}

// src/services/file.service.ts
function getStorageRecord(id) {
  const row = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(id);
  return row || null;
}
var downloadTickets = /* @__PURE__ */ new Map();
var DL_TICKET_TTL = 5 * 60 * 1e3;
function issueDownloadTicket(storageId, path10) {
  const ticket = crypto6.randomBytes(16).toString("hex");
  downloadTickets.set(ticket, { storageId, path: path10, exp: Date.now() + DL_TICKET_TTL });
  const now = Date.now();
  for (const [k, v] of downloadTickets) if (v.exp < now) downloadTickets.delete(k);
  return ticket;
}
function consumeDownloadTicket(ticket) {
  const t = downloadTickets.get(ticket);
  if (!t) return null;
  if (t.exp < Date.now()) {
    downloadTickets.delete(ticket);
    return null;
  }
  downloadTickets.delete(ticket);
  return { storageId: t.storageId, path: t.path };
}
function toEntryDTO(e) {
  return { name: e.name, path: e.path, isDir: e.isDir, size: e.size, mtime: e.mtime };
}
var fileService = {
  async list(storageId, path10, sort, order) {
    const rec = getStorageRecord(storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728");
    const driver = getDriver(rec);
    let entries = await driver.list(path10);
    entries = entries.map(toEntryDTO);
    const dir = (a, b) => a.name.localeCompare(b.name);
    const size = (a, b) => a.size - b.size;
    const time = (a, b) => a.mtime - b.mtime;
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      let r = 0;
      if (sort === "size") r = size(a, b);
      else if (sort === "mtime") r = time(a, b);
      else r = dir(a, b);
      return order === "desc" ? -r : r;
    });
    return { entries, parent: path10 === "/" ? null : path10.replace(/\/[^/]*\/?$/, "") || "/" };
  },
  async mkdir(storageId, path10, user) {
    const rec = getStorageRecord(storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728");
    await getDriver(rec).mkdir(path10);
    opLog(user?.id, user?.username, "mkdir", path10);
  },
  async rename(storageId, path10, newPath, user) {
    const rec = getStorageRecord(storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728");
    await getDriver(rec).rename(path10, newPath);
    opLog(user?.id, user?.username, "rename", `${path10} -> ${newPath}`);
  },
  async move(storageId, path10, destPath, user) {
    const rec = getStorageRecord(storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728");
    await getDriver(rec).move(path10, destPath);
    opLog(user?.id, user?.username, "move", `${path10} -> ${destPath}`);
  },
  async copy(storageId, path10, destPath, user) {
    const rec = getStorageRecord(storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728");
    await getDriver(rec).copy(path10, destPath);
    opLog(user?.id, user?.username, "copy", `${path10} -> ${destPath}`);
  },
  /** 删除 → 回收站 */
  async delete(storageId, path10, user) {
    const rec = getStorageRecord(storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728");
    await recycleService.moveToRecycle(storageId, path10, user?.id);
    opLog(user?.id, user?.username, "delete", path10);
  },
  async batchDelete(storageId, paths, user) {
    for (const p of paths) {
      await this.delete(storageId, p, user);
    }
  },
  async search(q, storageId, filters) {
    const db = getDb();
    const list = (storageId ? [db.prepare("SELECT * FROM storages WHERE id = ? AND enabled = 1").get(storageId)] : db.prepare("SELECT * FROM storages WHERE enabled = 1").all()).filter(Boolean);
    const out = [];
    for (const rec of list) {
      try {
        const driver = getDriver(rec);
        let entries = await driver.search(q, "/");
        if (filters) {
          entries = entries.filter((e) => {
            if (e.isDir) return false;
            if (filters.type) {
              const ext = e.name.split(".").pop()?.toLowerCase() || "";
              if (ext !== filters.type.toLowerCase()) return false;
            }
            if (filters.minSize !== void 0 && e.size < filters.minSize) return false;
            if (filters.maxSize !== void 0 && e.size > filters.maxSize) return false;
            if (filters.since) {
              const since = new Date(filters.since).getTime();
              if (e.mtime < since) return false;
            }
            if (filters.until) {
              const until = new Date(filters.until).getTime();
              if (e.mtime > until) return false;
            }
            return true;
          });
        }
        for (const e of entries) out.push({ storageId: rec.id, storageName: rec.name, entry: toEntryDTO(e) });
      } catch {
      }
    }
    return out;
  }
};

// src/routes/files.routes.ts
import fs3 from "node:fs";
import path3 from "node:path";
import AdmZip from "adm-zip";
async function previewAuth(req2, reply) {
  const header = req2.headers.authorization || "";
  let token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    const q = req2.query;
    if (q.token) token = q.token;
  }
  if (!token) return reply.code(401).send({ error: "\u672A\u767B\u5F55" });
  const payload = verifyJwt(token, jwtSecret);
  if (!payload) return reply.code(401).send({ error: "\u767B\u5F55\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55" });
  req2.user = payload;
}
async function fileRoutes(app) {
  app.get("/files", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const path10 = q.path || "/";
    try {
      const rec = getStorageRecord(storageId);
      const { entries, parent } = await fileService.list(storageId, path10, q.sort || "name", q.order || "asc");
      return ok(reply, { entries, parent, storage: rec ? { id: rec.id, name: rec.name, type: rec.type } : null });
    } catch (e) {
      return fail(reply, 500, e?.message || "\u76EE\u5F55\u5217\u8868\u5931\u8D25");
    }
  });
  app.post("/files/mkdir", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const { storageId, path: p } = req2.body;
    try {
      await fileService.mkdir(storageId, p, { username: req2.user.username, id: req2.user.sub });
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u521B\u5EFA\u76EE\u5F55\u5931\u8D25");
    }
  });
  app.post("/files/rename", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const { storageId, path: p, newPath } = req2.body;
    try {
      await fileService.rename(storageId, p, newPath, { username: req2.user.username, id: req2.user.sub });
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u91CD\u547D\u540D\u5931\u8D25");
    }
  });
  app.post("/files/move", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const { storageId, path: p, destPath } = req2.body;
    try {
      await fileService.move(storageId, p, destPath, { username: req2.user.username, id: req2.user.sub });
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u79FB\u52A8\u5931\u8D25");
    }
  });
  app.post("/files/copy", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const { storageId, path: p, destPath } = req2.body;
    try {
      await fileService.copy(storageId, p, destPath, { username: req2.user.username, id: req2.user.sub });
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u590D\u5236\u5931\u8D25");
    }
  });
  app.post("/files/delete", { preHandler: requirePermission("files:delete") }, async (req2, reply) => {
    const { storageId, path: p } = req2.body;
    try {
      await fileService.delete(storageId, p, { username: req2.user.username, id: req2.user.sub });
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5220\u9664\u5931\u8D25");
    }
  });
  app.post("/files/batch-delete", { preHandler: requirePermission("files:delete") }, async (req2, reply) => {
    const { storageId, paths } = req2.body;
    try {
      await fileService.batchDelete(storageId, paths, { username: req2.user.username, id: req2.user.sub });
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u6279\u91CF\u5220\u9664\u5931\u8D25");
    }
  });
  app.post("/files/download-ticket", { preHandler: requirePermission("files:download") }, async (req2, reply) => {
    const { storageId, path: path10 } = req2.body;
    try {
      const rec = getStorageRecord(storageId);
      if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
      const st = await getDriver(rec).stat(path10);
      if (!st) return fail(reply, 404, "\u6587\u4EF6\u4E0D\u5B58\u5728");
      if (st.isDir) return fail(reply, 400, "\u53EA\u80FD\u4E0B\u8F7D\u6587\u4EF6");
      return ok(reply, { ticket: issueDownloadTicket(storageId, path10) });
    } catch (e) {
      return fail(reply, 500, e?.message || "\u83B7\u53D6\u4E0B\u8F7D\u94FE\u63A5\u5931\u8D25");
    }
  });
  app.get("/files/download", async (req2, reply) => {
    const q = req2.query;
    try {
      let storageId;
      let p;
      if (q.ticket) {
        const t = consumeDownloadTicket(q.ticket);
        if (!t) return fail(reply, 401, "\u4E0B\u8F7D\u94FE\u63A5\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u83B7\u53D6");
        storageId = t.storageId;
        p = t.path;
      } else {
        await requirePermission("files:download")(req2, reply);
        if (reply.sent) return;
        storageId = Number(q.storageId);
        p = q.path || "";
      }
      const rec = getStorageRecord(storageId);
      if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
      const driver = getDriver(rec);
      const st = await driver.stat(p);
      if (!st || st.isDir) return fail(reply, 404, "\u6587\u4EF6\u4E0D\u5B58\u5728");
      const stream = await driver.download(p);
      const name = p.split("/").filter(Boolean).pop() || "download";
      reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
      reply.header("Content-Length", st.size);
      return reply.send(stream);
    } catch (e) {
      return fail(reply, 404, e?.message || "\u4E0B\u8F7D\u5931\u8D25");
    }
  });
  app.get("/files/preview", { preHandler: async (req2, reply) => {
    await previewAuth(req2, reply);
    if (!reply.sent) await requirePermission("files:view")(req2, reply);
  } }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const p = q.path || "";
    try {
      const rec = getStorageRecord(storageId);
      if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
      const driver = getDriver(rec);
      const st = await driver.stat(p);
      if (!st || st.isDir) return fail(reply, 404, "\u6587\u4EF6\u4E0D\u5B58\u5728");
      const total = st.size;
      const isLocal = rec.type === "local";
      const rangeHdr = req2.headers.range || "";
      let range;
      if (isLocal && rangeHdr.startsWith("bytes=")) {
        const m = rangeHdr.match(/bytes=(\d*)-(\d*)/);
        if (m) {
          const start = m[1] ? parseInt(m[1], 10) : 0;
          const end = m[2] ? parseInt(m[2], 10) : total - 1;
          const s = Math.max(0, Math.min(start, total - 1));
          const e = Math.max(s, Math.min(end, total - 1));
          if (s <= e) range = { start: s, end: e };
        }
      }
      const stream = await driver.download(p, range);
      const ext = p.split(".").pop()?.toLowerCase() || "";
      const MIME_MAP = {
        // 视频
        mp4: "video/mp4",
        mkv: "video/x-matroska",
        mov: "video/quicktime",
        webm: "video/webm",
        avi: "video/x-msvideo",
        flv: "video/x-flv",
        wmv: "video/x-ms-wmv",
        m4v: "video/x-m4v",
        ts: "video/mp2t",
        "3gp": "video/3gpp",
        // 音频
        mp3: "audio/mpeg",
        wav: "audio/wav",
        flac: "audio/flac",
        ogg: "audio/ogg",
        aac: "audio/aac",
        m4a: "audio/x-m4a",
        // 图片
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        bmp: "image/bmp",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        // 文档
        pdf: "application/pdf",
        txt: "text/plain",
        md: "text/markdown",
        html: "text/html",
        css: "text/css",
        js: "text/javascript",
        json: "application/json",
        csv: "text/csv",
        // 代码
        ts: "text/typescript",
        py: "text/x-python",
        java: "text/x-java",
        c: "text/x-c",
        cpp: "text/x-c++",
        h: "text/x-chdr",
        sh: "text/x-shell",
        go: "text/x-go",
        rs: "text/x-rust",
        vue: "text/vue"
      };
      const contentType = MIME_MAP[ext] || "application/octet-stream";
      reply.header("Content-Type", contentType);
      reply.header("Content-Disposition", `inline; filename="${encodeURIComponent(p.split("/").pop() || "file")}"`);
      reply.header("Cache-Control", "private, max-age=3600");
      reply.header("Accept-Ranges", "bytes");
      if (range) {
        reply.code(206);
        reply.header("Content-Range", `bytes ${range.start}-${range.end} ${total}`);
        reply.header("Content-Length", range.end - range.start + 1);
      } else {
        reply.header("Content-Length", total);
      }
      return reply.send(stream);
    } catch (e) {
      return fail(reply, 404, e?.message || "\u9884\u89C8\u5931\u8D25");
    }
  });
  app.get("/search", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    try {
      const results = await fileService.search(
        q.q || "",
        q.storageId ? Number(q.storageId) : void 0,
        {
          type: q.type || void 0,
          minSize: q.minSize ? Number(q.minSize) : void 0,
          maxSize: q.maxSize ? Number(q.maxSize) : void 0,
          since: q.since || void 0,
          until: q.until || void 0
        }
      );
      return ok(reply, { results });
    } catch (e) {
      return fail(reply, 500, e?.message || "\u641C\u7D22\u5931\u8D25");
    }
  });
  app.post("/files/batch-download", { preHandler: requirePermission("files:download") }, async (req2, reply) => {
    const b = req2.body;
    if (!b.paths?.length) return fail(reply, 400, "\u7F3A\u5C11\u6587\u4EF6\u5217\u8868");
    const storageId = b.storageId || 0;
    const rec = getStorageRecord(storageId);
    if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
    const zip = new AdmZip();
    function addDirRecursive(dirPath, zipFolder) {
      const items = fs3.readdirSync(dirPath);
      for (const item of items) {
        const itemPath = path3.join(dirPath, item);
        const stat = fs3.statSync(itemPath);
        if (stat.isDirectory()) {
          addDirRecursive(itemPath, zipFolder ? `${zipFolder}/${item}` : item);
        } else {
          const zipEntryPath = zipFolder ? `${zipFolder}/${item}` : item;
          zip.addLocalFile(itemPath, void 0, zipEntryPath);
        }
      }
    }
    for (const p of b.paths) {
      const fullPath = path3.join(dirs.storageRoot, p.replace(/^\//, ""));
      if (!fs3.existsSync(fullPath)) continue;
      const stat = fs3.statSync(fullPath);
      const zipBase = p.replace(/^\//, "").split("/").pop() || p;
      if (stat.isDirectory()) {
        addDirRecursive(fullPath, zipBase);
      } else {
        zip.addLocalFile(fullPath, void 0, zipBase);
      }
    }
    const buffer = zip.toBuffer();
    reply.header("Content-Type", "application/zip");
    reply.header("Content-Disposition", 'attachment; filename="batch-download.zip"');
    reply.header("Content-Length", buffer.length);
    return reply.send(buffer);
  });
  app.post("/files/compress", { preHandler: requirePermission("files:upload") }, async (req2, reply) => {
    const b = req2.body;
    if (!b.paths?.length) return fail(reply, 400, "\u7F3A\u5C11\u6587\u4EF6\u5217\u8868");
    const storageId = b.storageId || 0;
    const rec = getStorageRecord(storageId);
    if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
    const firstPath = b.paths[0].replace(/^\//, "");
    const baseName = firstPath.split("/").pop() || "archive";
    const zipName = baseName.endsWith(".zip") ? baseName : baseName + ".zip";
    const destDir = b.destPath ? path3.join(dirs.storageRoot, b.destPath.replace(/^\//, "")) : dirs.storageRoot;
    const zipPath = path3.join(destDir, zipName);
    const zip = new AdmZip();
    function addDirRecursive(dirPath, zipFolder) {
      const items = fs3.readdirSync(dirPath);
      for (const item of items) {
        const itemPath = path3.join(dirPath, item);
        const stat = fs3.statSync(itemPath);
        if (stat.isDirectory()) {
          addDirRecursive(itemPath, zipFolder ? `${zipFolder}/${item}` : item);
        } else {
          const zipEntryPath = zipFolder ? `${zipFolder}/${item}` : item;
          zip.addLocalFile(itemPath, void 0, zipEntryPath);
        }
      }
    }
    for (const p of b.paths) {
      const fullPath = path3.join(dirs.storageRoot, p.replace(/^\//, ""));
      if (!fs3.existsSync(fullPath)) continue;
      const stat = fs3.statSync(fullPath);
      const zipBase = p.replace(/^\//, "").split("/").pop() || p;
      if (stat.isDirectory()) {
        addDirRecursive(fullPath, zipBase);
      } else {
        zip.addLocalFile(fullPath, void 0, zipBase);
      }
    }
    fs3.writeFileSync(zipPath, zip.toBuffer());
    return ok(reply, { path: `/${zipName}`, name: zipName });
  });
  app.post("/files/decompress", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const b = req2.body;
    if (!b.path) return fail(reply, 400, "\u7F3A\u5C11 zip \u6587\u4EF6\u8DEF\u5F84");
    const storageId = b.storageId || 0;
    const rec = getStorageRecord(storageId);
    if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
    const zipFullPath = path3.join(dirs.storageRoot, b.path.replace(/^\//, ""));
    if (!fs3.existsSync(zipFullPath)) return fail(reply, 404, "zip \u6587\u4EF6\u4E0D\u5B58\u5728");
    if (!fs3.statSync(zipFullPath).isFile()) return fail(reply, 400, "\u4E0D\u662F\u6587\u4EF6");
    const destDir = b.destPath ? path3.join(dirs.storageRoot, b.destPath.replace(/^\//, "")) : path3.dirname(zipFullPath);
    try {
      const zip = new AdmZip(zipFullPath);
      zip.extractAllTo(destDir, true);
      const entries = zip.getEntries();
      return ok(reply, { extracted: entries.length });
    } catch (e) {
      return fail(reply, 500, "\u89E3\u538B\u5931\u8D25: " + e.message);
    }
  });
  app.get("/files/:path/meta", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const fullPath = path3.join(dirs.storageRoot, filePath.replace(/^\//, ""));
    try {
      const stat = fs3.statSync(fullPath);
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      const meta = {
        name: filePath.split("/").pop(),
        path: filePath,
        size: stat.size,
        isDir: stat.isDirectory(),
        mtime: stat.mtime.toISOString(),
        created: stat.birthtime.toISOString(),
        ext
      };
      if (!meta.isDir && ["png", "jpeg", "jpg"].includes(ext)) {
        try {
          const buf = fs3.readFileSync(fullPath);
          if (ext === "png" && buf.length > 24) {
            meta.width = buf.readUInt32BE(16);
            meta.height = buf.readUInt32BE(20);
          } else if (ext === "jpeg" || ext === "jpg") {
            meta.width = null;
            meta.height = null;
          }
        } catch {
        }
      }
      return ok(reply, { meta });
    } catch (e) {
      return fail(reply, 404, e?.message || "\u83B7\u53D6\u5143\u6570\u636E\u5931\u8D25");
    }
  });
  app.get("/files/:path/archive-list", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const rec = getStorageRecord(storageId);
    if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
    const p = req2.params.path;
    const fullPath = path3.join(dirs.storageRoot, p.replace(/^\//, ""));
    if (!fs3.existsSync(fullPath)) return fail(reply, 404, "\u6587\u4EF6\u4E0D\u5B58\u5728");
    const ext = path3.extname(fullPath).replace(".", "").toLowerCase();
    const entries = [];
    try {
      if (ext === "zip") {
        const zip = new AdmZip(fs3.readFileSync(fullPath));
        for (const entry of zip.getEntries()) {
          entries.push({
            name: entry.entryName,
            size: entry.isDirectory ? 0 : entry.size,
            isDir: entry.isDirectory
          });
        }
      } else if (ext === "tar" || ext === "gz" || ext === "tgz" || ext === "bz2") {
        return ok(reply, { entries: [], message: `\u6682\u4E0D\u652F\u6301 ${ext} \u683C\u5F0F\u9884\u89C8` });
      } else if (ext === "7z") {
        return ok(reply, { entries: [], message: "\u6682\u4E0D\u652F\u6301 7z \u683C\u5F0F\u9884\u89C8" });
      } else {
        return fail(reply, 400, `\u4E0D\u652F\u6301\u7684\u538B\u7F29\u5305\u683C\u5F0F: ${ext}`);
      }
    } catch (e) {
      return fail(reply, 500, e?.message || "\u89E3\u6790\u538B\u7F29\u5305\u5931\u8D25");
    }
    return ok(reply, { entries });
  });
}

// src/services/upload.service.ts
import crypto7 from "node:crypto";
import fs4 from "node:fs";
import path4 from "node:path";
import { Readable as Readable6 } from "node:stream";
var memory = /* @__PURE__ */ new Map();
function tmpDir(uploadId) {
  return path4.join(dirs.uploads, uploadId);
}
var uploadService = {
  init(params) {
    const db = getDb();
    const rec = db.prepare("SELECT * FROM storages WHERE id = ? AND enabled = 1").get(params.storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728\u6216\u5DF2\u7981\u7528");
    const uploadId = crypto7.randomUUID();
    const chunkSize = params.chunkSize || config.uploadChunkSize;
    const dir = tmpDir(uploadId);
    fs4.mkdirSync(dir, { recursive: true });
    const destDir = params.path.endsWith("/") ? params.path : params.path + "/";
    memory.set(uploadId, {
      uploadId,
      storageId: params.storageId,
      destPath: destDir + params.name,
      name: params.name,
      size: params.size,
      chunkSize,
      received: 0,
      status: "uploading",
      createdAt: Date.now()
    });
    return { uploadId, chunkSize };
  },
  async chunk(uploadId, chunkIndex, body) {
    const m = memory.get(uploadId);
    if (!m) throw new Error("\u4E0A\u4F20\u4F1A\u8BDD\u4E0D\u5B58\u5728");
    if (m.status === "completed") throw new Error("\u4E0A\u4F20\u5DF2\u5B8C\u6210");
    const expected = Math.ceil(m.size / m.chunkSize);
    if (chunkIndex >= expected) throw new Error("\u5206\u7247\u5E8F\u53F7\u8D8A\u754C");
    fs4.writeFileSync(path4.join(tmpDir(uploadId), String(chunkIndex)), body);
    m.received += body.length;
  },
  async complete(uploadId, user) {
    const m = memory.get(uploadId);
    if (!m) throw new Error("\u4E0A\u4F20\u4F1A\u8BDD\u4E0D\u5B58\u5728");
    if (m.status === "completed") return;
    const dir = tmpDir(uploadId);
    const chunks = fs4.readdirSync(dir).filter((f) => /^\d+$/.test(f)).sort((a, b) => Number(a) - Number(b));
    const total = Math.ceil(m.size / m.chunkSize);
    if (chunks.length < total) {
      throw new Error(`\u5206\u7247\u4E0D\u5B8C\u6574: ${chunks.length}/${total}`);
    }
    const rec = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(m.storageId);
    const driver = getDriver(rec);
    const bufs = [];
    for (const c of chunks) bufs.push(fs4.readFileSync(path4.join(dir, c)));
    await driver.upload(m.destPath, Readable6.from(bufs));
    fs4.rmSync(dir, { recursive: true, force: true });
    m.status = "completed";
    opLog(user?.id, user?.username, "upload", m.destPath);
  },
  /** 小文件直传（multipart file 已落到内存/磁盘由 fastify-multipart 处理，这里接收 Buffer 流） */
  async direct(params, data, user) {
    const rec = getDb().prepare("SELECT * FROM storages WHERE id = ? AND enabled = 1").get(params.storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728\u6216\u5DF2\u7981\u7528");
    const driver = getDriver(rec);
    await driver.upload(params.path, Readable6.from([data]));
    opLog(user?.id, user?.username, "upload_direct", params.path);
  },
  /** 清理过期会话 */
  prune(maxAgeMs = 24 * 3600 * 1e3) {
    const now = Date.now();
    for (const [id, m] of memory) {
      if (m.status === "uploading" && now - m.createdAt > maxAgeMs) {
        fs4.rmSync(tmpDir(id), { recursive: true, force: true });
        memory.delete(id);
      }
    }
  }
};

// src/routes/upload.routes.ts
function maxFileSizeBytes() {
  const gb = settingNum("maxFileSizeGB", 0);
  return gb > 0 ? Math.floor(gb * 1024 * 1024 * 1024) : 0;
}
async function readMultipart(req2) {
  const fields = {};
  let data = null;
  let filename = "";
  for await (const p of req2.parts()) {
    if (p.type === "file") {
      if (!data) {
        data = await p.toBuffer();
        filename = p.filename || "";
      }
    } else if (p.type === "field") {
      fields[p.fieldname] = p.value;
    }
  }
  return data ? { data, fields, filename } : null;
}
async function uploadRoutes(app) {
  app.post("/upload/init", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const b = req2.body;
    const maxBytes = maxFileSizeBytes();
    if (maxBytes > 0 && (b.size || 0) > maxBytes) {
      return fail(reply, 400, `\u8D85\u51FA\u5355\u6587\u4EF6\u5927\u5C0F\u4E0A\u9650\uFF08${settingNum("maxFileSizeGB", 0)} GB\uFF09`);
    }
    try {
      const r = uploadService.init({
        storageId: b.storageId,
        path: b.path,
        name: b.name,
        size: b.size,
        chunkSize: b.chunkSize,
        userId: req2.user.sub
      });
      return ok(reply, r);
    } catch (e) {
      return fail(reply, 400, e?.message || "\u521D\u59CB\u5316\u4E0A\u4F20\u5931\u8D25");
    }
  });
  app.post("/upload/chunk", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const isMultipart = String(req2.headers["content-type"] || "").includes("multipart");
    let uploadId = "";
    let chunkIndex = 0;
    try {
      if (isMultipart) {
        const r = await readMultipart(req2);
        if (!r) return fail(reply, 400, "\u7F3A\u5C11\u5206\u7247\u6570\u636E");
        uploadId = r.fields.uploadId || "";
        chunkIndex = Number(r.fields.chunkIndex || 0);
        await uploadService.chunk(uploadId, chunkIndex, r.data);
      } else {
        const q = req2.query;
        uploadId = q.uploadId || "";
        chunkIndex = Number(q.chunkIndex || 0);
        const data = Buffer.isBuffer(req2.body) ? req2.body : Buffer.from(String(req2.body));
        await uploadService.chunk(uploadId, chunkIndex, data);
      }
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u4E0A\u4F20\u5206\u7247\u5931\u8D25");
    }
  });
  app.post("/upload/complete", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const b = req2.body;
    try {
      await uploadService.complete(b.uploadId, { username: req2.user.username, id: req2.user.sub });
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5B8C\u6210\u4E0A\u4F20\u5931\u8D25");
    }
  });
  app.post("/upload/direct", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    try {
      const r = await readMultipart(req2);
      if (!r) return fail(reply, 400, "\u7F3A\u5C11\u6587\u4EF6");
      const maxBytes = maxFileSizeBytes();
      if (maxBytes > 0 && r.data.length > maxBytes) {
        return fail(reply, 400, `\u8D85\u51FA\u5355\u6587\u4EF6\u5927\u5C0F\u4E0A\u9650\uFF08${settingNum("maxFileSizeGB", 0)} GB\uFF09`);
      }
      const storageId = Number(r.fields.storageId);
      const p = r.fields.path || "";
      const name = r.filename || r.fields.name || "file";
      const destPath = p.endsWith("/") ? p + name : p;
      await uploadService.direct({ storageId, path: destPath, name }, r.data, {
        username: req2.user.username,
        id: req2.user.sub
      });
      return ok(reply, { ok: true, path: destPath });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u76F4\u4F20\u5931\u8D25");
    }
  });
}

// src/services/share.service.ts
import crypto8 from "node:crypto";
var tickets = /* @__PURE__ */ new Map();
var TICKET_TTL = 15 * 60 * 1e3;
function cleanTicket() {
  const now = Date.now();
  for (const [k, v] of tickets) if (v.exp < now) tickets.delete(k);
}
var shareService = {
  list(userId) {
    return getDb().prepare("SELECT * FROM shares WHERE created_by = ? ORDER BY id DESC").all(userId);
  },
  all() {
    return getDb().prepare("SELECT * FROM shares ORDER BY id DESC").all();
  },
  create(params) {
    const name = params.name || params.path.split("/").filter(Boolean).pop() || "\u5206\u4EAB";
    const token = crypto8.randomBytes(8).toString("hex");
    const info = getDb().prepare(
      `INSERT INTO shares (token, storage_id, path, name, password_hash, expires_at, max_downloads, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      token,
      params.storageId,
      params.path,
      name,
      params.password ? hashPassword(params.password) : null,
      params.expiresAt || null,
      params.maxDownloads ?? null,
      params.userId ?? null
    );
    opLog(params.userId, void 0, "share_create", params.path);
    return this.byId(Number(info.lastInsertRowid));
  },
  byId(id) {
    return getDb().prepare("SELECT * FROM shares WHERE id = ?").get(id) || null;
  },
  byToken(token) {
    return getDb().prepare("SELECT * FROM shares WHERE token = ?").get(token) || null;
  },
  update(id, patch) {
    const s = this.byId(id);
    if (!s) throw new Error("\u5206\u4EAB\u4E0D\u5B58\u5728");
    getDb().prepare(
      `UPDATE shares SET name = ?, password_hash = ?, expires_at = ?, max_downloads = ?, enabled = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(
      patch.name ?? s.name,
      patch.password !== void 0 ? patch.password ? hashPassword(patch.password) : null : s.password_hash,
      patch.expiresAt !== void 0 ? patch.expiresAt || null : s.expires_at,
      patch.maxDownloads !== void 0 ? patch.maxDownloads : s.max_downloads,
      patch.enabled !== void 0 ? patch.enabled ? 1 : 0 : s.enabled,
      id
    );
    return this.byId(id);
  },
  remove(id) {
    getDb().prepare("DELETE FROM shares WHERE id = ?").run(id);
  },
  /** 公开接口：分享信息（不含密码等敏感字段）；isDir/size 实时判断 */
  async publicInfo(token) {
    const s = this.byToken(token);
    if (!s || !s.enabled) return null;
    if (s.expires_at && /* @__PURE__ */ new Date(s.expires_at + "Z") < /* @__PURE__ */ new Date()) return null;
    const driver = getDriver(getDb().prepare("SELECT * FROM storages WHERE id = ?").get(s.storage_id));
    const st = await driver.stat(s.path);
    if (!st) return null;
    return {
      token,
      name: s.name,
      hasPassword: !!s.password_hash,
      expiresAt: s.expires_at,
      maxDownloads: s.max_downloads,
      downloadCount: s.download_count,
      path: s.path,
      storageId: s.storage_id,
      isDir: st.isDir,
      size: st.size
    };
  },
  /** 校验公开请求路径在分享范围内，返回真实存储路径（防路径越权） */
  async resolvePublicPath(s, driver, clientPath, wantDir) {
    const st = await driver.stat(s.path);
    if (!st) throw new Error("\u5206\u4EAB\u8D44\u6E90\u4E0D\u5B58\u5728");
    if (wantDir && !st.isDir) throw new Error("\u5206\u4EAB\u4E3A\u5355\u4E2A\u6587\u4EF6");
    const p = (clientPath || "/").replace(/\\/g, "/");
    if (p.split("/").some((seg) => seg === "..")) throw new Error("\u975E\u6CD5\u8DEF\u5F84");
    if (st.isDir) {
      if (p !== s.path && !p.startsWith(s.path + "/")) throw new Error("\u8DEF\u5F84\u8D85\u51FA\u5206\u4EAB\u8303\u56F4");
      return p;
    }
    if (p !== s.path) throw new Error("\u8DEF\u5F84\u8D85\u51FA\u5206\u4EAB\u8303\u56F4");
    return s.path;
  },
  /** 校验提取码，签发 ticket */
  extract(token, password) {
    const s = this.byToken(token);
    if (!s || !s.enabled) return null;
    if (s.expires_at && /* @__PURE__ */ new Date(s.expires_at + "Z") < /* @__PURE__ */ new Date()) return null;
    if (s.password_hash && !verifyPassword(password, s.password_hash)) return null;
    if (!s.password_hash) {
    }
    cleanTicket();
    const ticket = crypto8.randomBytes(16).toString("hex");
    tickets.set(ticket, { token, exp: Date.now() + TICKET_TTL });
    return ticket;
  },
  verifyTicket(ticket, token) {
    const t = tickets.get(ticket);
    if (!t || t.token !== token) return false;
    if (t.exp < Date.now()) {
      tickets.delete(ticket);
      return false;
    }
    return true;
  },
  async publicList(token, path10) {
    const s = this.byToken(token);
    if (!s || !s.enabled) throw new Error("\u5206\u4EAB\u4E0D\u5B58\u5728");
    const driver = getDriver(getDb().prepare("SELECT * FROM storages WHERE id = ?").get(s.storage_id));
    const real = await this.resolvePublicPath(s, driver, path10, true);
    const entries = await driver.list(real);
    return { entries, parent: real === s.path ? null : real.replace(/\/[^/]*\/?$/, "") || "/" };
  },
  async publicDownload(token, path10) {
    const s = this.byToken(token);
    if (!s || !s.enabled) throw new Error("\u5206\u4EAB\u4E0D\u5B58\u5728");
    if (s.max_downloads !== null && s.download_count >= s.max_downloads) throw new Error("\u4E0B\u8F7D\u6B21\u6570\u5DF2\u7528\u5B8C");
    getDb().prepare("UPDATE shares SET download_count = download_count + 1 WHERE id = ?").run(s.id);
    const driver = getDriver(getDb().prepare("SELECT * FROM storages WHERE id = ?").get(s.storage_id));
    const real = await this.resolvePublicPath(s, driver, path10 || s.path);
    const stream = await driver.download(real);
    return { stream, name: real.split("/").filter(Boolean).pop() || "download" };
  }
};

// src/services/shareStats.service.ts
var shareStatsService = {
  /** 获取某分享的统计 */
  get(shareId) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM share_stats WHERE share_id = ?").get(shareId);
    return row || { share_id: shareId, view_count: 0, download_count: 0, last_view_at: null, last_download_at: null };
  },
  /** 记录一次浏览 */
  recordView(shareId) {
    const db = getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
    db.prepare("INSERT INTO share_stats (share_id, view_count, last_view_at) VALUES (?, 1, ?) ON CONFLICT(share_id) DO UPDATE SET view_count = view_count + 1, last_view_at = ?").run(shareId, now, now);
  },
  /** 记录一次下载 */
  recordDownload(shareId) {
    const db = getDb();
    const now = (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").slice(0, 19);
    db.prepare("INSERT INTO share_stats (share_id, download_count, last_download_at) VALUES (?, 1, ?) ON CONFLICT(share_id) DO UPDATE SET download_count = download_count + 1, last_download_at = ?").run(shareId, now, now);
  }
};

// src/routes/share.routes.ts
async function shareRoutes(app) {
  app.get("/shares", { preHandler: requirePermission("files:share") }, async (req2, reply) => {
    return ok(reply, { shares: shareService.list(req2.user.sub) });
  });
  app.post("/shares", { preHandler: requirePermission("files:share") }, async (req2, reply) => {
    const b = req2.body;
    try {
      let expiresAt = b.expiresAt || null;
      if (!expiresAt) {
        const days = settingNum("shareDefaultExpireDays", 0);
        if (days > 0) expiresAt = new Date(Date.now() + days * 864e5).toISOString().replace("T", " ").slice(0, 19);
      }
      const s = shareService.create({ ...b, expiresAt, userId: req2.user.sub });
      return ok(reply, { share: s, url: `${config.appUrl}/s/${s.token}` });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u521B\u5EFA\u5206\u4EAB\u5931\u8D25");
    }
  });
  app.put("/shares/:id", { preHandler: requirePermission("files:share") }, async (req2, reply) => {
    const b = req2.body;
    try {
      const s = shareService.update(Number(req2.params.id), b);
      return ok(reply, { share: s });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u66F4\u65B0\u5206\u4EAB\u5931\u8D25");
    }
  });
  app.delete("/shares/:id", { preHandler: requirePermission("files:share") }, async (req2, reply) => {
    try {
      shareService.remove(Number(req2.params.id));
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5220\u9664\u5206\u4EAB\u5931\u8D25");
    }
  });
  app.get("/s/:token", async (req2, reply) => {
    const token = String(req2.params.token);
    const info = await shareService.publicInfo(token);
    if (!info) return fail(reply, 404, "\u5206\u4EAB\u4E0D\u5B58\u5728\u6216\u5DF2\u5931\u6548");
    const s = shareService.byToken(token);
    if (s) shareStatsService.recordView(s.id);
    return ok(reply, { share: info, appUrl: config.appUrl });
  });
  app.post("/s/:token/extract", async (req2, reply) => {
    const b = req2.body;
    const ticket = shareService.extract(String(req2.params.token), b.password || "");
    if (!ticket) return fail(reply, 403, "\u63D0\u53D6\u7801\u9519\u8BEF\u6216\u5206\u4EAB\u5DF2\u5931\u6548");
    return ok(reply, { ticket });
  });
  app.get("/s/:token/files", async (req2, reply) => {
    const q = req2.query;
    if (!shareService.verifyTicket(q.ticket || "", String(req2.params.token))) {
      return fail(reply, 401, "ticket \u65E0\u6548");
    }
    try {
      const r = await shareService.publicList(String(req2.params.token), q.path || "/");
      return ok(reply, r);
    } catch (e) {
      return fail(reply, 404, e?.message || "\u76EE\u5F55\u5217\u8868\u5931\u8D25");
    }
  });
  app.get("/s/:token/download", async (req2, reply) => {
    const token = String(req2.params.token);
    const q = req2.query;
    if (!shareService.verifyTicket(q.ticket || "", token)) {
      return fail(reply, 401, "ticket \u65E0\u6548");
    }
    try {
      const { stream, name } = await shareService.publicDownload(token, q.path);
      const s = shareService.byToken(token);
      if (s) shareStatsService.recordDownload(s.id);
      reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
      return reply.send(stream);
    } catch (e) {
      return fail(reply, 404, e?.message || "\u4E0B\u8F7D\u5931\u8D25");
    }
  });
  app.post("/s/:token/transfer", { preHandler: requirePermission("files:upload") }, async (req2, reply) => {
    const b = req2.body;
    const token = String(req2.params.token);
    if (!shareService.verifyTicket(b.ticket || "", token)) {
      return fail(reply, 401, "ticket \u65E0\u6548");
    }
    if (!b.paths?.length) return fail(reply, 400, "\u7F3A\u5C11\u6587\u4EF6\u5217\u8868");
    const userId = req2.user.sub;
    const { getDb: getDb2 } = await import("./db-YSRYK7QD.js");
    const db = getDb2();
    const storage = db.prepare("SELECT * FROM storages WHERE user_id = ? ORDER BY id LIMIT 1").get(userId);
    if (!storage) return fail(reply, 404, "\u8BF7\u5148\u521B\u5EFA\u5B58\u50A8\u7A7A\u95F4");
    const { dirs: dirs2 } = await import("./config-RKKBHRGG.js");
    const fs11 = await import("node:fs");
    const path10 = await import("node:path");
    const destBase = b.destPath || "/";
    const transferred = [];
    const errors = [];
    for (const p of b.paths) {
      try {
        const { stream, name } = await shareService.publicDownload(token, p);
        const destDir = path10.join(dirs2.storageRoot, (destBase === "/" ? "" : destBase).replace(/^\//, ""));
        if (!fs11.existsSync(destDir)) fs11.mkdirSync(destDir, { recursive: true });
        const destFile = path10.join(destDir, name);
        const writer = fs11.createWriteStream(destFile);
        await new Promise((resolve, reject) => {
          stream.pipe(writer);
          writer.on("finish", resolve);
          writer.on("error", reject);
          stream.on("error", reject);
        });
        transferred.push(p);
      } catch (e) {
        errors.push(`${p}: ${e?.message || "\u8F6C\u5B58\u5931\u8D25"}`);
      }
    }
    return ok(reply, { transferred, errors, destPath: destBase });
  });
}

// src/routes/user.routes.ts
function checkPasswordLen(pwd) {
  const minLen = settingNum("minPasswordLen", 8);
  return pwd.length < minLen ? `\u5BC6\u7801\u81F3\u5C11 ${minLen} \u4F4D` : null;
}
async function userRoutes(app) {
  app.get("/users", { preHandler: requirePermission("users:view") }, async (req2, reply) => {
    return ok(reply, { users: listUsers().map(publicUser) });
  });
  app.post("/users", { preHandler: requirePermission("users:manage") }, async (req2, reply) => {
    const b = req2.body;
    if (!b.username || !b.password) return fail(reply, 400, "\u7528\u6237\u540D\u548C\u5BC6\u7801\u5FC5\u586B");
    const pwdErr = checkPasswordLen(b.password);
    if (pwdErr) return fail(reply, 400, pwdErr);
    try {
      const u = createUser(b.username, b.password, b.role || "user", b.displayName || "", b.quota || 0);
      return ok(reply, { user: publicUser(u) });
    } catch (e) {
      return fail(reply, 409, e?.message?.includes("UNIQUE") ? "\u7528\u6237\u540D\u5DF2\u5B58\u5728" : "\u521B\u5EFA\u7528\u6237\u5931\u8D25");
    }
  });
  app.put("/users/:id", { preHandler: requirePermission("users:manage") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    const b = req2.body;
    if (b.password) {
      const pwdErr = checkPasswordLen(b.password);
      if (pwdErr) return fail(reply, 400, pwdErr);
    }
    try {
      updateUser(id, b);
      const u = findById(id);
      return ok(reply, { user: publicUser(u) });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u66F4\u65B0\u7528\u6237\u5931\u8D25");
    }
  });
  app.delete("/users/:id", { preHandler: requirePermission("users:manage") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    if (id === req2.user.sub) return fail(reply, 400, "\u4E0D\u80FD\u5220\u9664\u81EA\u5DF1");
    const target = findById(id);
    if (target?.role === "admin") return fail(reply, 403, "\u7BA1\u7406\u5458\u8D26\u53F7\u4E0D\u53EF\u5220\u9664");
    try {
      deleteUser(id);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5220\u9664\u7528\u6237\u5931\u8D25");
    }
  });
  app.post("/users/:id/reset-password", { preHandler: requirePermission("users:manage") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    const pwd = randomPassword();
    updateUser(id, { password: pwd });
    return ok(reply, { password: pwd });
  });
}

// src/routes/storage.routes.ts
async function storageRoutes(app) {
  app.get("/storages", { preHandler: requirePermission("storages:view") }, async (req2, reply) => {
    const db = getDb();
    const rows = req2.user.role === "admin" ? db.prepare("SELECT * FROM storages ORDER BY sort, id").all() : db.prepare("SELECT * FROM storages WHERE enabled = 1 ORDER BY sort, id").all();
    const out = [];
    for (const r of rows) {
      const storage = {
        id: r.id,
        name: r.name,
        type: r.type,
        enabled: !!r.enabled,
        sort: r.sort,
        config: JSON.parse(r.config || "{}")
      };
      try {
        const driver = createDriver({ ...r, config: JSON.parse(r.config || "{}") });
        const usage = await driver.usage();
        storage.used = usage.used;
        storage.files = usage.files;
      } catch {
        storage.used = 0;
        storage.files = 0;
      }
      out.push(storage);
    }
    return ok(reply, { storages: out, types: STORAGE_TYPES });
  });
  app.post("/storages", { preHandler: requirePermission("storages:manage") }, async (req2, reply) => {
    const b = req2.body;
    try {
      const info = getDb().prepare("INSERT INTO storages (name, type, config, sort) VALUES (?, ?, ?, ?)").run(b.name, b.type, JSON.stringify(b.config || {}), b.sort || 0);
      opLog(req2.user.sub, req2.user.username, "storage_create", b.name);
      return ok(reply, { id: Number(info.lastInsertRowid) });
    } catch (e) {
      return fail(reply, 409, e?.message?.includes("UNIQUE") ? "\u5B58\u50A8\u540D\u5DF2\u5B58\u5728" : "\u521B\u5EFA\u5B58\u50A8\u5931\u8D25");
    }
  });
  app.put("/storages/:id", { preHandler: requirePermission("storages:manage") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    const b = req2.body;
    try {
      const row = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(id);
      if (!row) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
      getDb().prepare(
        `UPDATE storages SET name = ?, type = ?, config = ?, enabled = ?, sort = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(
        b.name ?? row.name,
        b.type ?? row.type,
        JSON.stringify(b.config ?? JSON.parse(row.config || "{}")),
        b.enabled ?? row.enabled,
        b.sort ?? row.sort,
        id
      );
      invalidateDriver(id);
      opLog(req2.user.sub, req2.user.username, "storage_update", b.name ?? row.name);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u66F4\u65B0\u5B58\u50A8\u5931\u8D25");
    }
  });
  app.delete("/storages/:id", { preHandler: requirePermission("storages:manage") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    try {
      getDb().prepare("DELETE FROM storages WHERE id = ?").run(id);
      invalidateDriver(id);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5220\u9664\u5B58\u50A8\u5931\u8D25");
    }
  });
  app.post("/storages/:id/test", { preHandler: requirePermission("storages:manage") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    const row = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(id);
    if (!row) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
    try {
      const driver = createDriver({ ...row, config: JSON.parse(row.config || "{}") });
      await driver.test();
      return ok(reply, { ok: true });
    } catch (e) {
      return ok(reply, { ok: false, error: e?.message || "\u8FDE\u63A5\u5931\u8D25" });
    }
  });
  app.post("/storages/:id/toggle", { preHandler: requirePermission("storages:manage") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    const row = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(id);
    if (!row) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
    getDb().prepare("UPDATE storages SET enabled = ? WHERE id = ?").run(row.enabled ? 0 : 1, id);
    invalidateDriver(id);
    return ok(reply, { enabled: !row.enabled });
  });
}

// src/routes/settings.routes.ts
import fs5 from "node:fs";
import path5 from "node:path";
import crypto9 from "node:crypto";
var BG_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};
async function readUpload(req2) {
  let data = null;
  let filename = "";
  for await (const p of req2.parts()) {
    if (p.type === "file" && !data) {
      data = await p.toBuffer();
      filename = p.filename || "";
    }
  }
  return data ? { data, filename } : null;
}
async function settingsRoutes(app) {
  app.get("/settings", async (req2, reply) => {
    return ok(reply, publicSettings());
  });
  app.put("/settings", { preHandler: requirePermission("settings:manage") }, async (req2, reply) => {
    const b = req2.body;
    try {
      for (const [k, v] of Object.entries(b)) {
        setSetting(k, String(v));
      }
      return ok(reply, { settings: getAllSettings() });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u4FDD\u5B58\u8BBE\u7F6E\u5931\u8D25");
    }
  });
  app.post("/settings/background", { preHandler: requirePermission("settings:manage") }, async (req2, reply) => {
    try {
      const r = await readUpload(req2);
      if (!r) return fail(reply, 400, "\u7F3A\u5C11\u6587\u4EF6");
      const mime = String(req2.headers["content-type"] || "").split(";")[0].trim();
      const ext = BG_MIME[mime] || path5.extname(r.filename).replace(".", "").toLowerCase() || "jpg";
      if (!BG_MIME[mime] && !["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
        return fail(reply, 400, "\u4EC5\u652F\u6301 jpg/png/webp/gif \u80CC\u666F\u56FE");
      }
      const name = `${Date.now()}-${crypto9.randomBytes(4).toString("hex")}.${ext}`;
      fs5.writeFileSync(path5.join(dirs.backgrounds, name), r.data);
      const url = `/uploads/background/${name}`;
      return ok(reply, { url });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u80CC\u666F\u4E0A\u4F20\u5931\u8D25");
    }
  });
}

// src/routes/log.routes.ts
async function logRoutes(app) {
  app.get("/logs", { preHandler: requirePermission("logs:view") }, async (req2, reply) => {
    const q = req2.query;
    const page = Math.max(1, Number(q.page) || 1);
    const size = Math.min(200, Math.max(1, Number(q.size) || 50));
    if (q.type === "login") {
      return ok(reply, listLoginLogs(page, size));
    }
    return ok(reply, listOpLogs(page, size));
  });
  app.delete("/logs", { preHandler: requirePermission("logs:view") }, async (req2, reply) => {
    clearLogs();
    return ok(reply, { ok: true });
  });
}

// src/routes/recycle.routes.ts
async function recycleRoutes(app) {
  app.get("/recycle", { preHandler: requirePermission("recycle:view") }, async (req2, reply) => {
    return ok(reply, { items: recycleService.list() });
  });
  app.post("/recycle/restore", { preHandler: requirePermission("recycle:restore") }, async (req2, reply) => {
    const b = req2.body;
    try {
      recycleService.restore(b.id);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u6062\u590D\u5931\u8D25");
    }
  });
  app.delete("/recycle/:id", { preHandler: requirePermission("recycle:purge") }, async (req2, reply) => {
    try {
      recycleService.remove(Number(req2.params.id));
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5220\u9664\u5931\u8D25");
    }
  });
  app.delete("/recycle", { preHandler: requirePermission("recycle:purge") }, async (req2, reply) => {
    try {
      recycleService.clear();
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u6E05\u7A7A\u5931\u8D25");
    }
  });
}

// src/routes/stats.routes.ts
import fs6 from "node:fs";
function dirSize(dir) {
  let total = 0;
  if (!fs6.existsSync(dir)) return 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let items = [];
    try {
      items = fs6.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const it of items) {
      const p = `${d}/${it.name}`;
      if (it.isDirectory()) stack.push(p);
      else {
        try {
          total += fs6.statSync(p).size;
        } catch {
        }
      }
    }
  }
  return total;
}
async function statsRoutes(app) {
  app.get("/stats", { preHandler: requirePermission("stats:view") }, async (req2, reply) => {
    const db = getDb();
    const users = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
    const storages = db.prepare("SELECT COUNT(*) AS c FROM storages").get().c;
    const shares = db.prepare("SELECT COUNT(*) AS c FROM shares").get().c;
    const opLogs = db.prepare("SELECT COUNT(*) AS c FROM op_logs").get().c;
    const recycle = db.prepare("SELECT COUNT(*) AS c FROM recycle").get().c;
    const dbSize = fs6.existsSync(dirs.db) ? fs6.statSync(dirs.db).size : 0;
    const uploadSize = dirSize(dirs.uploads);
    const recycleSize = dirSize(dirs.recycle);
    return ok(reply, {
      users,
      storages,
      shares,
      opLogs,
      recycle,
      disk: { dbSize, uploadSize, recycleSize },
      uptime: process.uptime()
    });
  });
}

// src/services/sync.service.ts
import crypto10 from "node:crypto";
import { Readable as Readable7 } from "node:stream";
var syncService = {
  create(params) {
    const db = getDb();
    const rec = db.prepare("SELECT * FROM storages WHERE id = ? AND enabled = 1").get(params.storageId);
    if (!rec) throw new Error("\u5B58\u50A8\u4E0D\u5B58\u5728\u6216\u5DF2\u7981\u7528");
    const token = crypto10.randomBytes(24).toString("hex");
    const info = db.prepare(
      `INSERT INTO sync_pairs (token, user_id, storage_id, remote_path, local_path, mode)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).run(token, params.userId, params.storageId, params.remotePath.replace(/\/$/, "") || "/", params.localPath || null, params.mode);
    return db.prepare("SELECT * FROM sync_pairs WHERE id = ?").get(Number(info.lastInsertRowid));
  },
  listByUser(userId) {
    return getDb().prepare("SELECT * FROM sync_pairs WHERE user_id = ? ORDER BY id DESC").all(userId);
  },
  byToken(token) {
    const row = getDb().prepare("SELECT * FROM sync_pairs WHERE token = ? AND enabled = 1").get(token);
    return row || null;
  },
  remove(id, userId) {
    getDb().prepare("DELETE FROM sync_pairs WHERE id = ? AND user_id = ?").run(id, userId);
  },
  /** 远端清单：遍历 remote_path 下所有文件 */
  async manifest(token) {
    const pair = this.byToken(token);
    if (!pair) throw new Error("\u540C\u6B65\u4EE4\u724C\u65E0\u6548");
    const rec = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(pair.storage_id);
    const driver = getDriver(rec);
    const out = [];
    const base = pair.remote_path === "/" ? "" : pair.remote_path.replace(/\/$/, "");
    const walk = async (p) => {
      let entries;
      try {
        entries = await driver.list(p);
      } catch {
        return;
      }
      for (const e of entries) {
        const rel = e.path.slice(base.length) || "/";
        if (e.isDir) await walk(e.path);
        else out.push({ relPath: rel, size: e.size, mtime: e.mtime });
      }
    };
    await walk(base || "/");
    return out;
  },
  /** 回写清单 */
  report(token, files) {
    const pair = this.byToken(token);
    if (!pair) throw new Error("\u540C\u6B65\u4EE4\u724C\u65E0\u6548");
    const db = getDb();
    db.prepare("DELETE FROM sync_files WHERE pair_id = ?").run(pair.id);
    const ins = db.prepare("INSERT OR REPLACE INTO sync_files (pair_id, rel_path, hash, size, mtime) VALUES (?, ?, ?, ?, ?)");
    for (const f of files) {
      ins.run(pair.id, f.relPath, f.hash, f.size, f.mtime);
    }
  },
  /** 拉取远端文件 */
  async pull(token, relPath) {
    const pair = this.byToken(token);
    if (!pair) throw new Error("\u540C\u6B65\u4EE4\u724C\u65E0\u6548");
    const rec = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(pair.storage_id);
    const driver = getDriver(rec);
    const full = pair.remote_path === "/" ? relPath : pair.remote_path + relPath;
    opLog(pair.user_id, void 0, "sync_pull", full);
    return driver.download(full);
  },
  /** 推送本地文件 */
  async push(token, relPath, body) {
    const pair = this.byToken(token);
    if (!pair) throw new Error("\u540C\u6B65\u4EE4\u724C\u65E0\u6548");
    const rec = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(pair.storage_id);
    const driver = getDriver(rec);
    const full = pair.remote_path === "/" ? relPath : pair.remote_path + relPath;
    await driver.upload(full, Readable7.from([body]));
    opLog(pair.user_id, void 0, "sync_push", full);
  },
  /** 删除远端文件 */
  async removeFile(token, relPath) {
    const pair = this.byToken(token);
    if (!pair) throw new Error("\u540C\u6B65\u4EE4\u724C\u65E0\u6548");
    const rec = getDb().prepare("SELECT * FROM storages WHERE id = ?").get(pair.storage_id);
    const driver = getDriver(rec);
    const full = pair.remote_path === "/" ? relPath : pair.remote_path + relPath;
    await driver.delete(full, false);
    opLog(pair.user_id, void 0, "sync_delete", full);
  }
};

// src/routes/sync.routes.ts
async function syncRoutes(app) {
  app.post("/sync/pairs", { preHandler: requirePermission("sync:manage") }, async (req2, reply) => {
    const b = req2.body;
    try {
      const pair = syncService.create({
        userId: req2.user.sub,
        storageId: b.storageId,
        remotePath: b.remotePath || "/",
        mode: b.mode || "two-way",
        localPath: b.localPath
      });
      return ok(reply, { pair });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u521B\u5EFA\u540C\u6B65\u5BF9\u5931\u8D25");
    }
  });
  app.get("/sync/pairs", { preHandler: requirePermission("sync:view") }, async (req2, reply) => {
    return ok(reply, { pairs: syncService.listByUser(req2.user.sub) });
  });
  app.delete("/sync/pairs/:id", { preHandler: requirePermission("sync:manage") }, async (req2, reply) => {
    syncService.remove(Number(req2.params.id), req2.user.sub);
    return ok(reply, { ok: true });
  });
  app.get("/sync/manifest", async (req2, reply) => {
    const q = req2.query;
    try {
      const files = await syncService.manifest(q.token || "");
      return ok(reply, { files });
    } catch (e) {
      return fail(reply, 401, e?.message || "\u83B7\u53D6\u6E05\u5355\u5931\u8D25");
    }
  });
  app.post("/sync/manifest/report", async (req2, reply) => {
    const q = req2.query;
    const b = req2.body;
    try {
      syncService.report(q.token || "", b.files || []);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 401, e?.message || "\u56DE\u5199\u6E05\u5355\u5931\u8D25");
    }
  });
  app.post("/sync/pull", async (req2, reply) => {
    const q = req2.query;
    try {
      const stream = await syncService.pull(q.token || "", q.path || "");
      const name = (q.path || "").split("/").filter(Boolean).pop() || "file";
      reply.header("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
      return reply.send(stream);
    } catch (e) {
      return fail(reply, 404, e?.message || "\u62C9\u53D6\u5931\u8D25");
    }
  });
  app.post("/sync/push", async (req2, reply) => {
    const q = req2.query;
    try {
      const data = Buffer.isBuffer(req2.body) ? req2.body : Buffer.from(String(req2.body));
      await syncService.push(q.token || "", q.path || "", data);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u63A8\u9001\u5931\u8D25");
    }
  });
  app.post("/sync/delete", async (req2, reply) => {
    const q = req2.query;
    try {
      await syncService.removeFile(q.token || "", q.path || "");
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5220\u9664\u5931\u8D25");
    }
  });
}

// src/routes/role.routes.ts
async function roleRoutes(app) {
  app.get("/permissions", { preHandler: requirePermission("users:manage") }, async (_req, reply) => {
    return ok(reply, { permissions: PERMISSIONS, modules: MODULES, roles: ROLES });
  });
  app.get("/roles", { preHandler: requirePermission("users:manage") }, async (_req, reply) => {
    const roles = ROLES.map((r) => ({
      key: r.key,
      label: r.label,
      permissions: getRolePermissions(r.key)
    }));
    return ok(reply, { roles });
  });
  app.put("/roles/:role", { preHandler: requirePermission("users:manage") }, async (req2, reply) => {
    const role = req2.params.role;
    if (!ROLES.some((r) => r.key === role)) return fail(reply, 400, "\u65E0\u6548\u89D2\u8272");
    const b = req2.body;
    const keys = Array.isArray(b.permissions) ? b.permissions : [];
    if (role === "admin" && keys.length === 0) {
      return fail(reply, 400, "\u8D85\u7EA7\u7BA1\u7406\u5458\u81F3\u5C11\u4FDD\u7559\u4E00\u4E2A\u6743\u9650\uFF0C\u5426\u5219\u5C06\u65E0\u4EBA\u53EF\u7BA1\u7406");
    }
    const valid = keys.filter((k) => ALL_PERMISSION_KEYS.includes(k));
    setRolePermissions(role, valid);
    return ok(reply, { role, permissions: getRolePermissions(role) });
  });
}

// src/services/version.service.ts
import fs7 from "node:fs";
import path6 from "node:path";
var versionService = {
  /** 保存一个版本（覆盖前调用） */
  save(storageId, filePath, oldPath, size, mtime) {
    const db = getDb();
    const row = db.prepare("SELECT MAX(version) AS v FROM file_versions WHERE storage_id = ? AND path = ?").get(storageId, filePath);
    const nextVersion = (row.v || 0) + 1;
    const hash = Buffer.from(filePath).toString("hex");
    const verDir = path6.join(dirs.storageRoot, ".versions", String(storageId));
    fs7.mkdirSync(verDir, { recursive: true });
    const verFile = path6.join(verDir, `${hash}.v${nextVersion}`);
    fs7.copyFileSync(oldPath, verFile);
    db.prepare("INSERT INTO file_versions (storage_id, path, version, size, mtime, blob_path) VALUES (?, ?, ?, ?, ?, ?)").run(storageId, filePath, nextVersion, size, mtime, verFile);
    return nextVersion;
  },
  /** 列出某文件的所有版本 */
  list(storageId, filePath) {
    const db = getDb();
    return db.prepare("SELECT * FROM file_versions WHERE storage_id = ? AND path = ? ORDER BY version DESC").all(storageId, filePath);
  },
  /** 恢复某版本 */
  restore(storageId, filePath, version) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM file_versions WHERE storage_id = ? AND path = ? AND version = ?").get(storageId, filePath, version);
    if (!row) throw new Error("\u7248\u672C\u4E0D\u5B58\u5728");
    const currentPath = path6.join(dirs.storageRoot, filePath);
    if (fs7.existsSync(currentPath)) {
      const stat = fs7.statSync(currentPath);
      this.save(storageId, filePath, currentPath, stat.size, new Date(stat.mtime).toISOString());
    }
    fs7.copyFileSync(row.blob_path, currentPath);
    return currentPath;
  },
  /** 删除某版本 */
  remove(storageId, filePath, version) {
    const db = getDb();
    const row = db.prepare("SELECT * FROM file_versions WHERE storage_id = ? AND path = ? AND version = ?").get(storageId, filePath, version);
    if (!row) throw new Error("\u7248\u672C\u4E0D\u5B58\u5728");
    if (fs7.existsSync(row.blob_path)) fs7.unlinkSync(row.blob_path);
    db.prepare("DELETE FROM file_versions WHERE storage_id = ? AND path = ? AND version = ?").run(storageId, filePath, version);
  }
};

// src/services/tag.service.ts
var tagService = {
  list(storageId, filePath) {
    const db = getDb();
    const rows = db.prepare("SELECT tag FROM file_tags WHERE storage_id = ? AND path = ? ORDER BY tag").all(storageId, filePath);
    return rows.map((r) => r.tag);
  },
  add(storageId, filePath, tag) {
    const db = getDb();
    db.prepare("INSERT OR IGNORE INTO file_tags (storage_id, path, tag) VALUES (?, ?, ?)").run(storageId, filePath, tag.trim());
  },
  remove(storageId, filePath, tag) {
    const db = getDb();
    db.prepare("DELETE FROM file_tags WHERE storage_id = ? AND path = ? AND tag = ?").run(storageId, filePath, tag);
  },
  /** 按标签列出文件（跨存储） */
  filesByTag(tag) {
    const db = getDb();
    return db.prepare("SELECT storage_id, path, tag FROM file_tags WHERE tag = ? ORDER BY path").all(tag);
  },
  /** 所有标签（去重） */
  allTags() {
    const db = getDb();
    const rows = db.prepare("SELECT DISTINCT tag FROM file_tags ORDER BY tag").all();
    return rows.map((r) => r.tag);
  }
};

// src/services/comment.service.ts
var commentService = {
  list(storageId, filePath) {
    const db = getDb();
    return db.prepare("SELECT * FROM file_comments WHERE storage_id = ? AND path = ? ORDER BY created_at DESC").all(storageId, filePath);
  },
  add(storageId, filePath, userId, username, content) {
    const db = getDb();
    db.prepare("INSERT INTO file_comments (storage_id, path, user_id, username, content) VALUES (?, ?, ?, ?, ?)").run(storageId, filePath, userId, username, content.trim());
  },
  remove(id) {
    const db = getDb();
    db.prepare("DELETE FROM file_comments WHERE id = ?").run(id);
  }
};

// src/services/favorite.service.ts
var favoriteService = {
  list(userId) {
    const db = getDb();
    return db.prepare("SELECT * FROM file_favorites WHERE user_id = ? ORDER BY created_at DESC").all(userId);
  },
  add(userId, storageId, filePath) {
    const db = getDb();
    db.prepare("INSERT OR IGNORE INTO file_favorites (user_id, storage_id, path) VALUES (?, ?, ?)").run(userId, storageId, filePath);
  },
  remove(userId, storageId, filePath) {
    const db = getDb();
    db.prepare("DELETE FROM file_favorites WHERE user_id = ? AND storage_id = ? AND path = ?").run(userId, storageId, filePath);
  },
  isFavorite(userId, storageId, filePath) {
    const db = getDb();
    const row = db.prepare("SELECT 1 AS x FROM file_favorites WHERE user_id = ? AND storage_id = ? AND path = ?").get(userId, storageId, filePath);
    return !!row;
  }
};

// src/services/searchHistory.service.ts
var searchHistoryService = {
  list(userId, limit = 20) {
    const db = getDb();
    return db.prepare("SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit);
  },
  record(userId, query) {
    const db = getDb();
    const q = query.trim();
    if (!q) return;
    db.prepare("INSERT INTO search_history (user_id, query) VALUES (?, ?)").run(userId, q);
    db.prepare(
      "DELETE FROM search_history WHERE id NOT IN (SELECT id FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100)"
    ).run(userId);
  },
  clear(userId) {
    const db = getDb();
    db.prepare("DELETE FROM search_history WHERE user_id = ?").run(userId);
  }
};

// src/routes/extended.routes.ts
import fs8 from "node:fs";
import path7 from "node:path";
async function extendedRoutes(app) {
  app.get("/files/:path/versions", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    try {
      const versions = versionService.list(storageId, filePath);
      return ok(reply, { versions });
    } catch (e) {
      return fail(reply, 404, e?.message || "\u83B7\u53D6\u7248\u672C\u5931\u8D25");
    }
  });
  app.post("/files/:path/versions/:version/restore", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const version = Number(req2.params.version);
    try {
      versionService.restore(storageId, filePath, version);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u6062\u590D\u7248\u672C\u5931\u8D25");
    }
  });
  app.delete("/files/:path/versions/:version", { preHandler: requirePermission("files:delete") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const version = Number(req2.params.version);
    try {
      versionService.remove(storageId, filePath, version);
      return ok(reply, { ok: true });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u5220\u9664\u7248\u672C\u5931\u8D25");
    }
  });
  app.get("/files/:path/tags", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const tags = tagService.list(storageId, filePath);
    return ok(reply, { tags });
  });
  app.post("/files/:path/tags", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const b = req2.body;
    if (!b.tag?.trim()) return fail(reply, 400, "\u6807\u7B7E\u4E0D\u80FD\u4E3A\u7A7A");
    tagService.add(storageId, filePath, b.tag);
    return ok(reply, { tags: tagService.list(storageId, filePath) });
  });
  app.delete("/files/:path/tags/:tag", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const tag = decodeURIComponent(req2.params.tag);
    tagService.remove(storageId, filePath, tag);
    return ok(reply, { tags: tagService.list(storageId, filePath) });
  });
  app.get("/tags", { preHandler: requirePermission("files:view") }, async (_req, reply) => {
    return ok(reply, { tags: tagService.allTags() });
  });
  app.get("/files-by-tag", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    if (!q.tag) return fail(reply, 400, "\u6807\u7B7E\u4E0D\u80FD\u4E3A\u7A7A");
    const files = tagService.filesByTag(q.tag);
    return ok(reply, { files });
  });
  app.post("/tags", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const b = req2.body;
    if (!b.tag?.trim()) return fail(reply, 400, "\u6807\u7B7E\u4E0D\u80FD\u4E3A\u7A7A");
    return ok(reply, { tags: tagService.allTags() });
  });
  app.delete("/tags/:tag", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const tag = decodeURIComponent(req2.params.tag);
    const db = getDb();
    db.prepare("DELETE FROM file_tags WHERE tag = ?").run(tag);
    return ok(reply, { tags: tagService.allTags() });
  });
  app.get("/files/:path/comments", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const comments = commentService.list(storageId, filePath);
    return ok(reply, { comments });
  });
  app.post("/files/:path/comments", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const q = req2.query;
    const storageId = Number(q.storageId);
    const filePath = decodeURIComponent(req2.params.path);
    const b = req2.body;
    if (!b.content?.trim()) return fail(reply, 400, "\u6CE8\u91CA\u4E0D\u80FD\u4E3A\u7A7A");
    commentService.add(storageId, filePath, req2.user.sub, req2.user.username, b.content);
    const comments = commentService.list(storageId, filePath);
    return ok(reply, { comments });
  });
  app.delete("/files/:path/comments/:id", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    commentService.remove(id);
    return ok(reply, { ok: true });
  });
  app.get("/favorites", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const favs = favoriteService.list(req2.user.sub);
    return ok(reply, { favorites: favs });
  });
  app.post("/favorites", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const b = req2.body;
    if (!b.path) return fail(reply, 400, "\u7F3A\u5C11\u8DEF\u5F84");
    favoriteService.add(req2.user.sub, b.storageId || 0, b.path);
    return ok(reply, { ok: true });
  });
  app.delete("/favorites", { preHandler: requirePermission("files:write") }, async (req2, reply) => {
    const q = req2.query;
    favoriteService.remove(req2.user.sub, Number(q.storageId), decodeURIComponent(q.path || ""));
    return ok(reply, { ok: true });
  });
  app.get("/profile", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const profile = profileService.get(req2.user.sub);
    return ok(reply, { profile });
  });
  app.put("/profile", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const b = req2.body;
    try {
      const profile = profileService.update(req2.user.sub, b);
      return ok(reply, { profile });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u66F4\u65B0\u8D44\u6599\u5931\u8D25");
    }
  });
  app.put("/profile/account", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const b = req2.body;
    const userId = req2.user.sub;
    const user = findById(userId);
    if (!user) return fail(reply, 404, "\u7528\u6237\u4E0D\u5B58\u5728");
    if (b.username && b.username !== user.username) {
      if (b.username.length < 3 || b.username.length > 32) {
        return fail(reply, 400, "\u7528\u6237\u540D\u957F\u5EA6 3-32 \u4F4D");
      }
      try {
        updateUser(userId, { username: b.username });
      } catch (e) {
        return fail(reply, 409, e?.message?.includes("UNIQUE") ? "\u7528\u6237\u540D\u5DF2\u5B58\u5728" : "\u4FEE\u6539\u7528\u6237\u540D\u5931\u8D25");
      }
    }
    if (b.newPassword) {
      if (!b.oldPassword) return fail(reply, 400, "\u8BF7\u8F93\u5165\u539F\u5BC6\u7801");
      const valid = verifyPassword(b.oldPassword, user.password_hash);
      if (!valid) return fail(reply, 401, "\u539F\u5BC6\u7801\u9519\u8BEF");
      if (b.newPassword.length < 8) return fail(reply, 400, "\u65B0\u5BC6\u7801\u81F3\u5C11 8 \u4F4D");
      updateUser(userId, { password: b.newPassword });
    }
    const updated = findById(userId);
    return ok(reply, { user: publicUser(updated) });
  });
  app.get("/search-history", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const q = req2.query;
    const history = searchHistoryService.list(req2.user.sub, Number(q.limit) || 20);
    return ok(reply, { history });
  });
  app.post("/search-history", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const b = req2.body;
    if (b.query?.trim()) searchHistoryService.record(req2.user.sub, b.query);
    return ok(reply, { ok: true });
  });
  app.delete("/search-history", { preHandler: requirePermission("files:view") }, async (_req, reply) => {
    searchHistoryService.clear(req.user.sub);
    return ok(reply, { ok: true });
  });
  app.get("/shares/:id/stats", { preHandler: requirePermission("files:share") }, async (req2, reply) => {
    const id = Number(req2.params.id);
    const stats = shareStatsService.get(id);
    return ok(reply, { stats });
  });
  app.post("/avatar", { preHandler: requirePermission("files:view") }, async (req2, reply) => {
    const userId = req2.user.sub;
    try {
      const fileStream = await req2.file();
      if (!fileStream) return fail(reply, 400, "\u7F3A\u5C11\u6587\u4EF6");
      const filename = fileStream.filename || "avatar.png";
      const ext = path7.extname(filename) || ".png";
      const data = await fileStream.toBuffer();
      if (data.length === 0) return fail(reply, 400, "\u6587\u4EF6\u4E3A\u7A7A");
      if (data.length > 5 * 1024 * 1024) return fail(reply, 400, "\u5934\u50CF\u4E0D\u80FD\u8D85\u8FC7 5MB");
      const avatarDir = path7.join(config.dataDir, "avatars");
      if (!fs8.existsSync(avatarDir)) fs8.mkdirSync(avatarDir, { recursive: true });
      const avatarPath = path7.join(avatarDir, `avatar_${userId}${ext}`);
      fs8.writeFileSync(avatarPath, data);
      const avatarUrl = `/api/v1/avatar/${userId}`;
      profileService.update(userId, { avatar: avatarUrl });
      return ok(reply, { avatar: avatarUrl });
    } catch (e) {
      return fail(reply, 400, e?.message || "\u4E0A\u4F20\u5931\u8D25");
    }
  });
  app.get("/avatar/:userId", async (req2, reply) => {
    const userId = Number(req2.params.userId);
    const avatarDir = path7.join(config.dataDir, "avatars");
    const files = fs8.existsSync(avatarDir) ? fs8.readdirSync(avatarDir) : [];
    const file = files.find((f) => f.startsWith(`avatar_${userId}`));
    if (!file) return fail(reply, 404, "\u5934\u50CF\u4E0D\u5B58\u5728");
    const filePath = path7.join(avatarDir, file);
    const data = fs8.readFileSync(filePath);
    reply.header("Content-Type", file.endsWith(".png") ? "image/png" : "image/jpeg");
    return reply.send(data);
  });
}

// src/routes/new-features.routes.ts
async function newFeaturesRoutes(app) {
  app.get("/files/by-type", { preHandler: authMiddleware }, async (req2, reply) => {
    const { storageId, type } = req2.query;
    if (!storageId) return fail(reply, 400, "\u7F3A\u5C11 storageId");
    try {
      const rec = getStorageRecord(Number(storageId));
      if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
      const { entries } = await fileService.list(Number(storageId), "/", "name", "asc");
      const VIDEO_EXTS = ["mp4", "avi", "mkv", "mov", "flv", "wmv", "webm"];
      const DOC_EXTS = ["pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx", "txt", "md"];
      let exts = [];
      if (type === "video") exts = VIDEO_EXTS;
      else if (type === "document") exts = DOC_EXTS;
      const filtered = entries.filter((e) => {
        if (e.isDir) return false;
        const ext = e.name.split(".").pop()?.toLowerCase() || "";
        return exts.includes(ext);
      });
      return ok(reply, { entries: filtered });
    } catch (e) {
      return fail(reply, 500, e.message || "\u52A0\u8F7D\u5931\u8D25");
    }
  });
  app.get("/files/recent", { preHandler: authMiddleware }, async (req2, reply) => {
    const { storageId, limit = "50" } = req2.query;
    if (!storageId) return fail(reply, 400, "\u7F3A\u5C11 storageId");
    try {
      const rec = getStorageRecord(Number(storageId));
      if (!rec) return fail(reply, 404, "\u5B58\u50A8\u4E0D\u5B58\u5728");
      const { entries } = await fileService.list(Number(storageId), "/", "mtime", "desc");
      return ok(reply, { entries: entries.slice(0, Number(limit)) });
    } catch (e) {
      return fail(reply, 500, e.message || "\u52A0\u8F7D\u5931\u8D25");
    }
  });
  app.get("/files/quick-access", { preHandler: authMiddleware }, async (req2, reply) => {
    const { storageId } = req2.query;
    if (!storageId) return fail(reply, 400, "\u7F3A\u5C11 storageId");
    const db = getDb();
    const rows = db.prepare("SELECT * FROM quick_access WHERE storage_id = ? ORDER BY created_at DESC").all(Number(storageId));
    return ok(reply, { entries: rows });
  });
  app.post("/files/quick-access/:path", { preHandler: authMiddleware }, async (req2, reply) => {
    const { storageId } = req2.query;
    const { path: path10 } = req2.params;
    if (!storageId) return fail(reply, 400, "\u7F3A\u5C11 storageId");
    const db = getDb();
    const decodedPath = decodeURIComponent(path10);
    const existing = db.prepare("SELECT * FROM quick_access WHERE storage_id = ? AND path = ?").get(Number(storageId), decodedPath);
    if (existing) {
      db.prepare("DELETE FROM quick_access WHERE id = ?").run(existing.id);
      return ok(reply, { action: "removed" });
    } else {
      db.prepare("INSERT INTO quick_access (storage_id, path, name, is_dir, created_at) VALUES (?, ?, ?, ?, datetime('now'))").run(
        Number(storageId),
        decodedPath,
        decodedPath.split("/").pop(),
        0
      );
      return ok(reply, { action: "added" });
    }
  });
  app.get("/hidden-space/status", { preHandler: authMiddleware }, async (req2, reply) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM hidden_space_settings").all();
    return ok(reply, { hasPassword: rows.length > 0 });
  });
  app.post("/hidden-space/set-password", { preHandler: authMiddleware }, async (req2, reply) => {
    const { storageId, password } = req2.body;
    if (!storageId || !password) return fail(reply, 400, "\u7F3A\u5C11\u53C2\u6570");
    if (password.length < 4) return fail(reply, 400, "\u5BC6\u7801\u81F3\u5C11 4 \u4F4D");
    const db = getDb();
    const existing = db.prepare("SELECT * FROM hidden_space_settings WHERE storage_id = ?").get(Number(storageId));
    if (existing) {
      const hash = Buffer.from(password).toString("hex");
      db.prepare("UPDATE hidden_space_settings SET password_hash = ? WHERE storage_id = ?").run(hash, Number(storageId));
    } else {
      const hash = Buffer.from(password).toString("hex");
      db.prepare("INSERT INTO hidden_space_settings (storage_id, password_hash, created_at) VALUES (?, ?, datetime('now'))").run(Number(storageId), hash);
    }
    return ok(reply, { success: true });
  });
  app.post("/hidden-space/unlock", { preHandler: authMiddleware }, async (req2, reply) => {
    const { storageId, password } = req2.body;
    if (!storageId || !password) return fail(reply, 400, "\u7F3A\u5C11\u53C2\u6570");
    const db = getDb();
    const existing = db.prepare("SELECT * FROM hidden_space_settings WHERE storage_id = ?").get(Number(storageId));
    if (!existing) {
      return fail(reply, 400, "\u8BF7\u5148\u8BBE\u7F6E\u5BC6\u7801");
    }
    const hash = Buffer.from(password).toString("hex");
    if (existing.password_hash !== hash) {
      return ok(reply, { unlocked: false });
    }
    try {
      const rec = getStorageRecord(Number(storageId));
      if (rec) {
        const driver = getDriver(rec);
        await driver.mkdir("/hidden");
      }
    } catch {
    }
    return ok(reply, { unlocked: true });
  });
  app.get("/subscriptions", { preHandler: authMiddleware }, async (req2, reply) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM subscriptions ORDER BY created_at DESC").all();
    return ok(reply, { subscriptions: rows });
  });
  app.get("/transfers", { preHandler: authMiddleware }, async (req2, reply) => {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM transfers ORDER BY created_at DESC").all();
    return ok(reply, { transfers: rows });
  });
  app.post("/transfers", { preHandler: authMiddleware }, async (req2, reply) => {
    const { shareUrl } = req2.body;
    if (!shareUrl) return fail(reply, 400, "\u8BF7\u8F93\u5165\u5206\u4EAB\u94FE\u63A5");
    const db = getDb();
    db.prepare("INSERT INTO transfers (share_url, file_count, created_at) VALUES (?, ?, datetime('now'))").run(shareUrl, 0);
    return ok(reply, { transferred: 0, message: "\u8F6C\u5B58\u8BF7\u6C42\u5DF2\u8BB0\u5F55" });
  });
}

// src/routes/update.routes.ts
import fs9 from "node:fs";
import path8 from "node:path";
import { execSync, spawn } from "node:child_process";
function getCurrentVersion() {
  try {
    const scriptDir = path8.dirname(process.argv[1] || "");
    const candidates = [
      path8.join(scriptDir, "..", "package.json"),
      // dist/ -> server/
      path8.join(scriptDir, "..", "..", "package.json"),
      // dist/ -> apps/
      path8.join(scriptDir, "..", "..", "..", "package.json")
      // dist/ -> root
    ];
    for (const p of candidates) {
      if (fs9.existsSync(p)) {
        const pkg = JSON.parse(fs9.readFileSync(p, "utf-8"));
        if (pkg.version) return pkg.version;
      }
    }
  } catch {
  }
  return "0.1.0";
}
async function updateRoutes(app) {
  app.get("/system/check-update", { preHandler: requirePermission("settings:view") }, async (req2, reply) => {
    try {
      const res = await fetch("https://api.github.com/repos/yihuansan/nebula-drive/releases/latest", {
        headers: {
          "User-Agent": "NebulaDrive",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (res.status === 404) {
        const currentVersion2 = getCurrentVersion();
        return ok(reply, {
          currentVersion: currentVersion2,
          latestVersion: currentVersion2,
          isUpdateAvailable: false,
          message: "GitHub \u4E0A\u8FD8\u6CA1\u6709\u53D1\u5E03\u7248\u672C\uFF0C\u5F53\u524D\u5DF2\u662F\u6700\u65B0"
        });
      }
      if (!res.ok) {
        return fail(reply, 500, "\u65E0\u6CD5\u8FDE\u63A5 GitHub\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC");
      }
      const latest = await res.json();
      const currentVersion = getCurrentVersion();
      const latestVersion = latest.tag_name?.replace(/^v/, "") || latest.version || "unknown";
      const isUpdateAvailable = compareVersions(currentVersion, latestVersion) < 0;
      return ok(reply, {
        currentVersion,
        latestVersion,
        isUpdateAvailable,
        releaseNotes: latest.body || "",
        publishedAt: latest.published_at,
        downloadUrl: latest.html_url
      });
    } catch (e) {
      return fail(reply, 500, e.message || "\u68C0\u67E5\u66F4\u65B0\u5931\u8D25");
    }
  });
  app.post("/system/perform-update", { preHandler: requirePermission("settings:view") }, async (_req, reply) => {
    try {
      const res = await fetch("https://api.github.com/repos/yihuansan/nebula-drive/releases/latest", {
        headers: {
          "User-Agent": "NebulaDrive",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (!res.ok) {
        return fail(reply, 500, "\u65E0\u6CD5\u83B7\u53D6\u6700\u65B0\u7248\u672C\u4FE1\u606F");
      }
      const latest = await res.json();
      const asset = latest.assets?.[0];
      if (!asset) {
        return fail(reply, 500, "\u6700\u65B0\u7248\u672C\u6CA1\u6709\u53EF\u7528\u7684\u5B89\u88C5\u5305");
      }
      const tmpDir2 = path8.join(process.cwd(), "tmp_update");
      fs9.mkdirSync(tmpDir2, { recursive: true });
      const zipPath = path8.join(tmpDir2, "update.zip");
      const zipRes = await fetch(asset.browser_download_url, {
        headers: { "User-Agent": "NebulaDrive" }
      });
      if (!zipRes.ok) {
        return fail(reply, 500, "\u4E0B\u8F7D\u7248\u672C\u5305\u5931\u8D25");
      }
      const buffer = await zipRes.arrayBuffer();
      fs9.writeFileSync(zipPath, Buffer.from(buffer));
      const extractDir = path8.join(tmpDir2, "extracted");
      fs9.mkdirSync(extractDir, { recursive: true });
      try {
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, { timeout: 6e4 });
      } catch {
        execSync(`tar -xf "${zipPath}" -C "${extractDir}"`, { timeout: 6e4 });
      }
      const distDir = path8.join(extractDir, "dist");
      if (!fs9.existsSync(distDir)) {
        return fail(reply, 500, "\u7248\u672C\u5305\u683C\u5F0F\u9519\u8BEF\uFF1A\u7F3A\u5C11 dist \u76EE\u5F55");
      }
      const serverDist = path8.join(process.cwd(), "apps", "server", "dist");
      if (fs9.existsSync(serverDist)) {
        fs9.rmSync(serverDist, { recursive: true, force: true });
      }
      fs9.cpSync(distDir, serverDist, { recursive: true });
      const webDist = path8.join(process.cwd(), "apps", "web", "dist");
      const webDistInPkg = path8.join(extractDir, "apps", "web", "dist");
      if (fs9.existsSync(webDistInPkg)) {
        if (fs9.existsSync(webDist)) {
          fs9.rmSync(webDist, { recursive: true, force: true });
        }
        fs9.cpSync(webDistInPkg, webDist, { recursive: true });
      }
      fs9.rmSync(tmpDir2, { recursive: true, force: true });
      setTimeout(() => {
        const child = spawn(process.execPath, [process.argv[1]], {
          cwd: process.cwd(),
          detached: true,
          stdio: "ignore"
        });
        child.unref();
        process.exit(0);
      }, 2e3);
      return ok(reply, { message: "\u66F4\u65B0\u6210\u529F\uFF0C\u670D\u52A1\u5668\u5373\u5C06\u91CD\u542F" });
    } catch (e) {
      return fail(reply, 500, e.message || "\u66F4\u65B0\u5931\u8D25");
    }
  });
  app.get("/system/update-log", { preHandler: requirePermission("settings:view") }, async (req2, reply) => {
    try {
      const res = await fetch("https://api.github.com/repos/yihuansan/nebula-drive/releases?per_page=5", {
        headers: {
          "User-Agent": "NebulaDrive",
          "Accept": "application/vnd.github.v3+json"
        }
      });
      if (!res.ok) {
        return fail(reply, 500, "\u65E0\u6CD5\u83B7\u53D6\u66F4\u65B0\u65E5\u5FD7");
      }
      const releases = await res.json();
      return ok(reply, {
        releases: releases.map((r) => ({
          version: r.tag_name?.replace(/^v/, "") || "unknown",
          name: r.name,
          notes: r.body,
          publishedAt: r.published_at
        }))
      });
    } catch (e) {
      return fail(reply, 500, e.message || "\u83B7\u53D6\u66F4\u65B0\u65E5\u5FD7\u5931\u8D25");
    }
  });
}
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

// src/index.ts
function seedDefaultStorage() {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) AS c FROM storages").get();
  if (row.c === 0) {
    db.prepare("INSERT INTO storages (name, type, config, sort) VALUES (?, ?, ?, ?)").run(
      "\u672C\u5730\u5B58\u50A8",
      "local",
      JSON.stringify({ root: dirs.storageRoot }),
      0
    );
    console.log("[seed] \u5DF2\u521B\u5EFA\u9ED8\u8BA4\u672C\u5730\u5B58\u50A8\uFF08\u6839\u76EE\u5F55: storage/\uFF09");
    return;
  }
  const rec = db.prepare("SELECT id, config FROM storages WHERE type = ? ORDER BY id LIMIT 1").get("local");
  if (rec) {
    try {
      const cfg = JSON.parse(rec.config);
      if (!cfg.root || !path9.isAbsolute(cfg.root)) {
        db.prepare("UPDATE storages SET config = ? WHERE id = ?").run(
          JSON.stringify({ root: dirs.storageRoot }),
          rec.id
        );
        console.log("[seed] \u5DF2\u4FEE\u6B63\u9ED8\u8BA4\u672C\u5730\u5B58\u50A8\u6839\u76EE\u5F55\u4E3A\u7EDD\u5BF9\u8DEF\u5F84");
      }
    } catch {
    }
  }
}
async function buildApp() {
  const app = Fastify({
    logger: { level: "info" },
    bodyLimit: 1024 * 1024 * 1024,
    // 1GB，分片上传
    maxParamLength: 512
  });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(multipart, {
    limits: { fileSize: 1024 * 1024 * 1024, files: 100 }
  });
  app.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
  app.addContentTypeParser("application/x-raw", { parseAs: "buffer" }, (_req, body, done) => done(null, body));
  app.get("/health", async () => ({ status: "ok", app: config.appName, time: (/* @__PURE__ */ new Date()).toISOString() }));
  app.get("/api/v1/health", async () => ({ status: "ok" }));
  const api = async (instance) => {
    await instance.register(authRoutes);
    await instance.register(fileRoutes);
    await instance.register(uploadRoutes);
    await instance.register(shareRoutes);
    await instance.register(userRoutes);
    await instance.register(storageRoutes);
    await instance.register(settingsRoutes);
    await instance.register(logRoutes);
    await instance.register(recycleRoutes);
    await instance.register(statsRoutes);
    await instance.register(syncRoutes);
    await instance.register(roleRoutes);
    await instance.register(extendedRoutes);
    await instance.register(newFeaturesRoutes);
    await instance.register(updateRoutes);
  };
  await app.register(api, { prefix: "/api/v1" });
  const bgMime = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif"
  };
  app.get("/uploads/background/:name", (req2, reply) => {
    const name = req2.params.name;
    const file = path9.join(dirs.backgrounds, name);
    if (!fs10.existsSync(file) || !fs10.statSync(file).isFile()) {
      return reply.code(404).send({ error: "Not Found" });
    }
    const ext = path9.extname(name).toLowerCase();
    return reply.type(bgMime[ext] || "application/octet-stream").send(fs10.createReadStream(file));
  });
  const here = path9.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path9.resolve(here, "../../web/dist"),
    // 开发/构建后：apps/server/dist/../.. -> apps/web/dist
    path9.resolve(process.cwd(), "apps/web/dist")
    // 从仓库根运行
  ];
  const webDist = candidates.find((p) => fs10.existsSync(p));
  if (webDist) {
    await app.register(fstatic, { root: webDist, index: "index.html" });
    app.setNotFoundHandler((req2, reply) => {
      if (req2.raw.url?.startsWith("/api/")) return reply.code(404).send({ error: "Not Found" });
      return reply.sendFile("index.html");
    });
  }
  return app;
}
async function main() {
  ensureDirs();
  initJwtSecret();
  getDb();
  seedAdmin();
  seedDefaultStorage();
  ensureRolePermissions();
  const app = await buildApp();
  const timer = setInterval(() => uploadService.prune(), 6 * 3600 * 1e3);
  timer.unref();
  const purgeRecycle = () => {
    const days = settingNum("recycleRetentionDays", 0);
    if (days <= 0) return;
    try {
      const n = recycleService.purgeOlderThan(days);
      if (n > 0) console.log(`[recycle] \u81EA\u52A8\u6E05\u7406 ${n} \u6761\u8D85\u8FC7 ${days} \u5929\u7684\u56DE\u6536\u7AD9\u8BB0\u5F55`);
    } catch (e) {
      console.error("[recycle] \u81EA\u52A8\u6E05\u7406\u5931\u8D25:", e?.message || e);
    }
  };
  purgeRecycle();
  const recycleTimer = setInterval(purgeRecycle, 3600 * 1e3);
  recycleTimer.unref();
  await app.listen({ port: config.port, host: config.host });
  console.log(`
  ${config.appName} \u5DF2\u542F\u52A8: http://${config.host}:${config.port}`);
  console.log(`  API \u524D\u7F00: /api/v1  \u5065\u5EB7\u68C0\u67E5: /health
`);
}
main().catch((err) => {
  console.error("\u542F\u52A8\u5931\u8D25:", err);
  process.exit(1);
});
