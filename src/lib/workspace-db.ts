import { getDatabase } from "@/lib/database";
import type { StudyDocument, StudyTask, StudyTopic } from "@/lib/study-data";

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

function ensureWorkspace(userId: string) {
  getDatabase().prepare("INSERT INTO user_workspaces (user_id, updated_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING")
    .run(userId, new Date().toISOString());
}

export function loadWorkspace(userId: string): WorkspaceSnapshot {
  const db = getDatabase();
  ensureWorkspace(userId);
  const workspace = db.prepare("SELECT attempts, analytics_opt_in FROM user_workspaces WHERE user_id = ?")
    .get(userId) as { attempts: number; analytics_opt_in: number };
  return {
    documents: db.prepare("SELECT id, title, kind, updated, content FROM user_documents WHERE user_id = ? ORDER BY rowid")
      .all(userId) as unknown as StudyDocument[],
    topics: db.prepare("SELECT id, name, unit, mastery, status, reason, source, evidence FROM user_topics WHERE user_id = ? ORDER BY rowid")
      .all(userId) as unknown as StudyTopic[],
    tasks: (db.prepare("SELECT id, title, topic, duration, priority, description, done FROM user_tasks WHERE user_id = ? ORDER BY rowid")
      .all(userId) as unknown as (Omit<StudyTask, "done"> & { done: number })[])
      .map((task) => ({ ...task, done: Boolean(task.done) })),
    attempts: workspace.attempts,
    analyticsOptIn: Boolean(workspace.analytics_opt_in),
  };
}

export function saveWorkspace(userId: string, snapshot: WorkspaceSnapshot) {
  const db = getDatabase();
  ensureWorkspace(userId);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM user_documents WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_topics WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM user_tasks WHERE user_id = ?").run(userId);
    const insertDocument = db.prepare("INSERT INTO user_documents (user_id, id, title, kind, updated, content) VALUES (?, ?, ?, ?, ?, ?)");
    for (const document of snapshot.documents) insertDocument.run(userId, document.id, document.title, document.kind, document.updated, document.content);
    const insertTopic = db.prepare("INSERT INTO user_topics (user_id, id, name, unit, mastery, status, reason, source, evidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const topic of snapshot.topics) insertTopic.run(userId, topic.id, topic.name, topic.unit, topic.mastery, topic.status, topic.reason, topic.source, topic.evidence);
    const insertTask = db.prepare("INSERT INTO user_tasks (user_id, id, title, topic, duration, priority, description, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    for (const task of snapshot.tasks) insertTask.run(userId, task.id, task.title, task.topic, task.duration, task.priority, task.description, Number(task.done));
    db.prepare("UPDATE user_workspaces SET attempts = ?, analytics_opt_in = ?, updated_at = ? WHERE user_id = ?")
      .run(snapshot.attempts, Number(snapshot.analyticsOptIn), new Date().toISOString(), userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return loadWorkspace(userId);
}

export function recordActivity(userId: string, event: ActivityEventInput) {
  const db = getDatabase();
  const workspace = db.prepare("SELECT analytics_opt_in FROM user_workspaces WHERE user_id = ?").get(userId) as { analytics_opt_in: number } | undefined;
  if (!workspace?.analytics_opt_in) return false;
  db.prepare("INSERT INTO user_activity_events (user_id, kind, page, topic_id, document_id, duration_seconds, score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(userId, event.kind, event.page ?? null, event.topicId ?? null, event.documentId ?? null, event.durationSeconds ?? 0, event.score ?? null, new Date().toISOString());
  return true;
}

export function updateAnalyticsConsent(userId: string, enabled: boolean) {
  ensureWorkspace(userId);
  getDatabase().prepare("UPDATE user_workspaces SET analytics_opt_in = ?, updated_at = ? WHERE user_id = ?")
    .run(Number(enabled), new Date().toISOString(), userId);
}

export function listActivity(userId: string) {
  return getDatabase().prepare(`
    SELECT events.id, events.kind, events.page, events.duration_seconds AS durationSeconds,
      events.score, events.created_at AS createdAt, topics.name AS topicName, documents.title AS documentTitle
    FROM user_activity_events AS events
    LEFT JOIN user_topics AS topics ON topics.user_id = events.user_id AND topics.id = events.topic_id
    LEFT JOIN user_documents AS documents ON documents.user_id = events.user_id AND documents.id = events.document_id
    WHERE events.user_id = ?
    ORDER BY events.id DESC LIMIT 100
  `).all(userId);
}

export function clearActivity(userId: string) {
  getDatabase().prepare("DELETE FROM user_activity_events WHERE user_id = ?").run(userId);
}