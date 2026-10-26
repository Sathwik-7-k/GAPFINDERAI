import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/database";

const SESSION_COOKIE = "gapfinder_session";
const SESSION_DAYS = 14;
const PASSWORD_BYTES = 64;

export type AuthUser = { id: string; name: string; email: string };

function sessionHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function passwordHash(password: string, salt: string) {
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, PASSWORD_BYTES, { N: 16_384, r: 8, p: 1 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
  return derived.toString("hex");
}

export async function registerUser(name: string, email: string, password: string): Promise<AuthUser> {
  const db = getDatabase();
  const id = randomUUID();
  const salt = randomBytes(16).toString("hex");
  const hash = await passwordHash(password, salt);
  const normalizedEmail = email.trim().toLowerCase();
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("INSERT INTO users (id, name, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, name.trim(), normalizedEmail, hash, salt, new Date().toISOString());
    db.prepare("INSERT INTO user_workspaces (user_id, updated_at) VALUES (?, ?)").run(id, new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return { id, name: name.trim(), email: normalizedEmail };
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const db = getDatabase();
  const record = db.prepare("SELECT id, name, email, password_hash, password_salt FROM users WHERE email = ? COLLATE NOCASE")
    .get(email.trim().toLowerCase()) as (AuthUser & { password_hash: string; password_salt: string }) | undefined;
  if (!record) {
    await passwordHash(password, "gapfinder-invalid-user-salt");
    return null;
  }
  const candidate = Buffer.from(await passwordHash(password, record.password_salt), "hex");
  const expected = Buffer.from(record.password_hash, "hex");
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  return { id: record.id, name: record.name, email: record.email };
}

export function createSession(userId: string) {
  const db = getDatabase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sessionHash(token), userId, expiresAt);
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
  return token;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const record = getDatabase().prepare(`
    SELECT users.id, users.name, users.email
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `).get(sessionHash(token), new Date().toISOString()) as AuthUser | undefined;
  return record ?? null;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) getDatabase().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sessionHash(token));
  cookieStore.delete(SESSION_COOKIE);
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}