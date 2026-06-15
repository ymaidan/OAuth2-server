import { getDb } from './db.js';
import { verifyPassword } from './password.js';

export function toUserInfoClaims(user) {
  return {
    sub: user.id,
    name: `${user.given_name} ${user.family_name}`,
    email: user.email,
    preferred_username: user.username,
    given_name: user.given_name,
    family_name: user.family_name,
    role: user.role,
  };
}

export function getUserById(userId) {
  return getDb()
    .prepare(
      `SELECT id, username, email, given_name, family_name, role
       FROM users
       WHERE id = ?`
    )
    .get(userId);
}

export function listUsers() {
  return getDb()
    .prepare(
      `SELECT id, username, email, given_name, family_name, role
       FROM users
       ORDER BY username`
    )
    .all();
}

export function authenticateUser(username, password) {
  const user = getDb()
    .prepare(
      `SELECT id, username, email, password_hash, given_name, family_name, role
       FROM users
       WHERE username = ? OR email = ?`
    )
    .get(username, username);

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
