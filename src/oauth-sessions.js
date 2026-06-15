import { getDb } from './db.js';

const SESSION_TTL_MS = 10 * 60 * 1000;

export function saveLoginSession(state, userId) {
  getDb()
    .prepare(
      `INSERT INTO oauth_login_sessions (state, user_id, created_at)
       VALUES (?, ?, ?)`
    )
    .run(state, userId, Date.now());
}

export function bindAuthCodeToUser(code, state) {
  const session = getDb()
    .prepare(
      `SELECT user_id, created_at
       FROM oauth_login_sessions
       WHERE state = ?`
    )
    .get(state);

  if (!session || Date.now() - session.created_at >= SESSION_TTL_MS) {
    return false;
  }

  getDb()
    .prepare(
      `INSERT INTO oauth_auth_codes (code, user_id, created_at)
       VALUES (?, ?, ?)`
    )
    .run(code, session.user_id, Date.now());

  getDb().prepare('DELETE FROM oauth_login_sessions WHERE state = ?').run(state);
  return true;
}

export function getUserIdByAuthCode(code) {
  const row = getDb()
    .prepare(
      `SELECT user_id, created_at
       FROM oauth_auth_codes
       WHERE code = ?`
    )
    .get(code);

  if (!row || Date.now() - row.created_at >= SESSION_TTL_MS) {
    return null;
  }

  return row.user_id;
}

export function cleanupOAuthSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  const db = getDb();
  db.prepare('DELETE FROM oauth_login_sessions WHERE created_at < ?').run(cutoff);
  db.prepare('DELETE FROM oauth_auth_codes WHERE created_at < ?').run(cutoff);
}
