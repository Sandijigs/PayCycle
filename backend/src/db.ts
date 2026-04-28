import Database, { type Database as DatabaseType } from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "..", "paycycle.db");

const db: DatabaseType = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ──────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS plan_metadata (
    plan_id     INTEGER PRIMARY KEY,
    description TEXT,
    image_url   TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    address      TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    role         TEXT DEFAULT 'subscriber',
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    address    TEXT,
    category   TEXT DEFAULT 'general',
    message    TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── Plan Metadata ───────────────────────────────────────

const upsertMetadata = db.prepare(`
  INSERT INTO plan_metadata (plan_id, description, image_url, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(plan_id) DO UPDATE SET
    description = excluded.description,
    image_url   = excluded.image_url,
    updated_at  = datetime('now')
`);

const getMetadata = db.prepare(`
  SELECT * FROM plan_metadata WHERE plan_id = ?
`);

// ─── Users ───────────────────────────────────────────────

const upsertUser = db.prepare(`
  INSERT INTO users (address, display_name, role, updated_at)
  VALUES (?, ?, ?, datetime('now'))
  ON CONFLICT(address) DO UPDATE SET
    display_name = excluded.display_name,
    role         = excluded.role,
    updated_at   = datetime('now')
`);

const getUser = db.prepare(`
  SELECT * FROM users WHERE address = ?
`);

// ─── Feedback ────────────────────────────────────────────

const insertFeedback = db.prepare(`
  INSERT INTO feedback (address, category, message) VALUES (?, ?, ?)
`);

const listFeedback = db.prepare(`
  SELECT * FROM feedback ORDER BY created_at DESC LIMIT ? OFFSET ?
`);

const countFeedback = db.prepare(`
  SELECT COUNT(*) as total FROM feedback
`);

// ─── Exports ─────────────────────────────────────────────

export const planMetadataDb = {
  upsert(planId: number, description: string | null, imageUrl: string | null) {
    return upsertMetadata.run(planId, description, imageUrl);
  },
  get(planId: number) {
    return getMetadata.get(planId) as
      | { plan_id: number; description: string | null; image_url: string | null; created_at: string; updated_at: string }
      | undefined;
  },
};

export const usersDb = {
  upsert(address: string, displayName: string, role: string = "subscriber") {
    return upsertUser.run(address, displayName, role);
  },
  get(address: string) {
    return getUser.get(address) as
      | { address: string; display_name: string; role: string; created_at: string; updated_at: string }
      | undefined;
  },
};

export const feedbackDb = {
  insert(address: string | null, category: string, message: string) {
    return insertFeedback.run(address, category, message);
  },
  list(limit: number = 50, offset: number = 0) {
    return listFeedback.all(limit, offset) as Array<{
      id: number;
      address: string | null;
      category: string;
      message: string;
      created_at: string;
    }>;
  },
  count() {
    return (countFeedback.get() as { total: number }).total;
  },
};

export default db;
