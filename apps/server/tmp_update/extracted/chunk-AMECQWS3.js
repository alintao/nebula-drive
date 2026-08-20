import {
  dirs
} from "./chunk-DHPE4UXE.js";

// src/db/index.ts
import { DatabaseSync } from "node:sqlite";

// src/db/schema.ts
function runMigrations(db2) {
  db2.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
      display_name  TEXT DEFAULT '',
      quota         INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
      last_login_at TEXT,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS storages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      type       TEXT NOT NULL,
      config     TEXT NOT NULL DEFAULT '{}',
      enabled    INTEGER NOT NULL DEFAULT 1,
      sort       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shares (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      token          TEXT NOT NULL UNIQUE,
      storage_id     INTEGER NOT NULL,
      path           TEXT NOT NULL,
      name           TEXT NOT NULL,
      password_hash  TEXT,
      expires_at     TEXT,
      max_downloads  INTEGER,
      download_count INTEGER NOT NULL DEFAULT 0,
      enabled        INTEGER NOT NULL DEFAULT 1,
      created_by     INTEGER,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recycle (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      storage_id INTEGER NOT NULL,
      path       TEXT NOT NULL,
      name       TEXT NOT NULL,
      size       INTEGER NOT NULL DEFAULT 0,
      is_dir     INTEGER NOT NULL DEFAULT 0,
      local_copy TEXT,
      deleted_by INTEGER,
      deleted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS op_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER,
      username   TEXT,
      action     TEXT NOT NULL,
      path       TEXT,
      ip         TEXT,
      ua         TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS login_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL,
      ip         TEXT,
      ua         TEXT,
      success    INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      role       TEXT NOT NULL,
      permission TEXT NOT NULL,
      PRIMARY KEY (role, permission)
    );

    CREATE TABLE IF NOT EXISTS sync_pairs (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      token        TEXT NOT NULL UNIQUE,
      user_id      INTEGER NOT NULL,
      storage_id   INTEGER NOT NULL,
      remote_path  TEXT NOT NULL,
      local_path   TEXT,
      mode         TEXT NOT NULL DEFAULT 'two-way' CHECK (mode IN ('push','pull','two-way')),
      enabled      INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_files (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      pair_id    INTEGER NOT NULL,
      rel_path   TEXT NOT NULL,
      hash       TEXT NOT NULL DEFAULT '',
      size       INTEGER NOT NULL DEFAULT 0,
      mtime      INTEGER NOT NULL DEFAULT 0,
      synced_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (pair_id, rel_path)
    );

    CREATE TABLE IF NOT EXISTS file_versions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      storage_id INTEGER NOT NULL,
      path       TEXT NOT NULL,
      version    INTEGER NOT NULL DEFAULT 1,
      size       INTEGER NOT NULL DEFAULT 0,
      mtime      TEXT,
      blob_path  TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (storage_id, path, version)
    );

    CREATE TABLE IF NOT EXISTS file_tags (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      storage_id INTEGER NOT NULL,
      path       TEXT NOT NULL,
      tag        TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (storage_id, path, tag)
    );

    CREATE TABLE IF NOT EXISTS file_comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      storage_id INTEGER NOT NULL,
      path       TEXT NOT NULL,
      user_id    INTEGER,
      username   TEXT,
      content    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS share_stats (
      share_id     INTEGER PRIMARY KEY,
      view_count   INTEGER NOT NULL DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      last_view_at TEXT,
      last_download_at TEXT
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id    INTEGER PRIMARY KEY,
      avatar     TEXT DEFAULT '',
      email      TEXT DEFAULT '',
      bio        TEXT DEFAULT '',
      phone      TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      query      TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS file_favorites (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      storage_id INTEGER NOT NULL,
      path       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, storage_id, path)
    );

    CREATE TABLE IF NOT EXISTS quick_access (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      storage_id INTEGER NOT NULL,
      path       TEXT NOT NULL,
      name       TEXT NOT NULL,
      is_dir     INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (storage_id, path)
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      share_id   INTEGER,
      title      TEXT NOT NULL,
      sharer     TEXT DEFAULT '',
      auto_refresh INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      share_url  TEXT NOT NULL,
      file_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hidden_space_settings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      storage_id    INTEGER NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_quick_access_storage ON quick_access (storage_id);
    CREATE INDEX IF NOT EXISTS idx_op_logs_created ON op_logs (created_at);
    CREATE INDEX IF NOT EXISTS idx_sync_files_pair ON sync_files (pair_id);
    CREATE INDEX IF NOT EXISTS idx_file_versions_path ON file_versions (storage_id, path);
    CREATE INDEX IF NOT EXISTS idx_file_tags_path ON file_tags (storage_id, path);
    CREATE INDEX IF NOT EXISTS idx_file_comments_path ON file_comments (storage_id, path);
    CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history (user_id);
    CREATE INDEX IF NOT EXISTS idx_file_favorites_user ON file_favorites (user_id);
  `);
}

// src/db/index.ts
var db = null;
function getDb() {
  if (!db) {
    db = new DatabaseSync(dirs.db);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA foreign_keys = ON;");
    runMigrations(db);
  }
  return db;
}
function closeDb() {
  db?.close();
  db = null;
}

export {
  getDb,
  closeDb
};
