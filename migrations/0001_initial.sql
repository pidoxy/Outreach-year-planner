CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 username TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('admin','editor','viewer')),
 password_hash TEXT NOT NULL,
 salt TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS records (
 kind TEXT NOT NULL CHECK(kind IN ('event','task','done')),
 id TEXT NOT NULL,
 body TEXT NOT NULL CHECK(json_valid(body)),
 version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL,
 updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 PRIMARY KEY(kind,id)
);
CREATE TABLE IF NOT EXISTS login_attempts (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 reset_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value INTEGER NOT NULL);
INSERT OR IGNORE INTO metadata VALUES ('revision',0);
