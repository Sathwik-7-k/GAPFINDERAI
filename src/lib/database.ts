import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.TMPDIR);
const databasePath = isServerless
  ? join("/tmp", "gapfinder.sqlite")
  : join(process.cwd(), "data", "gapfinder.sqlite");
let connection: DatabaseSync | undefined;

export function getDatabase() {
  if (connection) return connection;
  try {
    mkdirSync(dirname(databasePath), { recursive: true });
  } catch {
    // Directory might already exist or be /tmp
  }
  const db = new DatabaseSync(databasePath);
  try {
    db.exec(`PRAGMA journal_mode = WAL;`);
  } catch {
    // If WAL is unsupported on serverless filesystem, continue with default mode
  }
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS user_workspaces (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      attempts INTEGER NOT NULL DEFAULT 0,
      analytics_opt_in INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_documents (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      updated TEXT NOT NULL,
      content TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE TABLE IF NOT EXISTS user_topics (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      mastery INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Unassessed',
      reason TEXT NOT NULL,
      source TEXT NOT NULL,
      evidence TEXT NOT NULL,
      PRIMARY KEY (user_id, id)
    );
    CREATE TABLE IF NOT EXISTS user_tasks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      duration TEXT NOT NULL,
      priority TEXT NOT NULL,
      description TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, id)
    );
    CREATE TABLE IF NOT EXISTS user_activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      page TEXT,
      topic_id TEXT,
      document_id TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      score INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS user_activity_recent_idx ON user_activity_events(user_id, id DESC);
  `);
  db.exec(`
    DROP TABLE IF EXISTS activity_events;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS topics;
    DROP TABLE IF EXISTS documents;
    DROP TABLE IF EXISTS workspaces;
  `);
  connection = db;
  return db;
}