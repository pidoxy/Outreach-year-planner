CREATE TABLE IF NOT EXISTS snapshots (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL,
 reason TEXT NOT NULL,
 body TEXT NOT NULL CHECK(json_valid(body))
);
CREATE INDEX IF NOT EXISTS snapshots_created ON snapshots(created_at);
