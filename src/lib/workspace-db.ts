import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { initialDocuments, initialTasks, initialTopics, type StudyDocument, type StudyTask, type StudyTopic } from "@/lib/study-data";

export type WorkspaceSnapshot = {
  documents: StudyDocument[];
  topics: StudyTopic[];
  tasks: StudyTask[];
  attempts: number;
  analyticsOptIn: boolean;
};

export type ActivityEventInput = {
  kind: "page_view" | "topic_view" | "study_time" | "task_completed" | "diagnostic";
  page?: string;
  topicId?: string;
  documentId?: string;
  durationSeconds?: number;
  score?: number;
};

const databasePath = join(process.cwd(), "data", "gapfinder.sqlite");
let connection: DatabaseSync | undefined;

function database() {
  if (connection) return connection;
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      attempts INTEGER NOT NULL DEFAULT 0,
      analytics_opt_in INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT NOT NULL,
      updated TEXT NOT NULL,
      content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      mastery INTEGER NOT NULL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      source TEXT NOT NULL,
      evidence TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      topic TEXT NOT NULL,
      duration TEXT NOT NULL,
      priority TEXT NOT NULL,
      description TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS activity_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      page TEXT,
      topic_id TEXT,
      document_id TEXT,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      score INTEGER,
      created_at TEXT NOT NULL
    );
  `);
  const workspaceColumns = db.prepare("PRAGMA table_info(workspaces)").all() as { name: string }[];
  if (!workspaceColumns.some((column) => column.name === "analytics_opt_in")) {
    db.exec("ALTER TABLE workspaces ADD COLUMN analytics_opt_in INTEGER NOT NULL DEFAULT 0");
  }
  connection = db;
  return db;
}

function writeSnapshot(db: DatabaseSync, snapshot: WorkspaceSnapshot) {
  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DELETE FROM documents; DELETE FROM topics; DELETE FROM tasks;");
    const insertDocument = db.prepare("INSERT INTO documents (id, title, kind, updated, content) VALUES (?, ?, ?, ?, ?)");
    for (const document of snapshot.documents) insertDocument.run(document.id, document.title, document.kind, document.updated, document.content);
    const insertTopic = db.prepare("INSERT INTO topics (id, name, unit, mastery, status, reason, source, evidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for (const topic of snapshot.topics) insertTopic.run(topic.id, topic.name, topic.unit, topic.mastery, topic.status, topic.reason, topic.source, topic.evidence);
    const insertTask = db.prepare("INSERT INTO tasks (id, title, topic, duration, priority, description, done) VALUES (?, ?, ?, ?, ?, ?, ?)");
    for (const task of snapshot.tasks) insertTask.run(task.id, task.title, task.topic, task.duration, task.priority, task.description, Number(task.done));
    db.prepare("INSERT INTO workspaces (id, attempts, analytics_opt_in, updated_at) VALUES ('demo', ?, ?, ?) ON CONFLICT(id) DO UPDATE SET attempts = excluded.attempts, analytics_opt_in = excluded.analytics_opt_in, updated_at = excluded.updated_at")
      .run(snapshot.attempts, Number(snapshot.analyticsOptIn), new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function loadWorkspace(): WorkspaceSnapshot {
  const db = database();
  const workspace = db.prepare("SELECT attempts FROM workspaces WHERE id = 'demo'").get() as { attempts: number } | undefined;
  if (!workspace) writeSnapshot(db, { documents: initialDocuments, topics: initialTopics, tasks: initialTasks, attempts: 2, analyticsOptIn: false });
  const current = db.prepare("SELECT attempts, analytics_opt_in FROM workspaces WHERE id = 'demo'").get() as { attempts: number; analytics_opt_in: number };
  return {
    documents: db.prepare("SELECT id, title, kind, updated, content FROM documents ORDER BY rowid").all() as unknown as StudyDocument[],
    topics: db.prepare("SELECT id, name, unit, mastery, status, reason, source, evidence FROM topics ORDER BY rowid").all() as unknown as StudyTopic[],
    tasks: (db.prepare("SELECT id, title, topic, duration, priority, description, done FROM tasks ORDER BY rowid").all() as unknown as (Omit<StudyTask, "done"> & { done: number })[])
      .map((task) => ({ ...task, done: Boolean(task.done) })),
    attempts: current.attempts,
    analyticsOptIn: Boolean(current.analytics_opt_in),
  };
}

export function saveWorkspace(snapshot: WorkspaceSnapshot) {
  writeSnapshot(database(), snapshot);
  return loadWorkspace();
}

export function recordActivity(event: ActivityEventInput) {
  const snapshot = loadWorkspace();
  if (!snapshot.analyticsOptIn) return false;
  database().prepare("INSERT INTO activity_events (kind, page, topic_id, document_id, duration_seconds, score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(event.kind, event.page ?? null, event.topicId ?? null, event.documentId ?? null, event.durationSeconds ?? 0, event.score ?? null, new Date().toISOString());
  return true;
}

export function updateAnalyticsConsent(enabled: boolean) {
  const snapshot = loadWorkspace();
  snapshot.analyticsOptIn = enabled;
  saveWorkspace(snapshot);
}

export function listActivity() {
  loadWorkspace();
  return database().prepare(`
    SELECT activity_events.id, activity_events.kind, activity_events.page, activity_events.duration_seconds AS durationSeconds,
      activity_events.score, activity_events.created_at AS createdAt, topics.name AS topicName, documents.title AS documentTitle
    FROM activity_events
    LEFT JOIN topics ON topics.id = activity_events.topic_id
    LEFT JOIN documents ON documents.id = activity_events.document_id
    ORDER BY activity_events.id DESC LIMIT 100
  `).all();
}

export function clearActivity() {
  database().exec("DELETE FROM activity_events");
}