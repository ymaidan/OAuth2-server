import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';
import { hashPassword } from './password.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

const SEED_USERS = [
  {
    id: 'floos-user-001',
    username: 'ahmed_demo',
    email: 'ahmed.demo@floos.bh',
    password: 'demo1234',
    given_name: 'Ahmed',
    family_name: 'Demo',
    role: 'engineer',
  },
  {
    id: 'floos-user-002',
    username: 'sara_ali',
    email: 'sara.ali@floos.bh',
    password: 'demo1234',
    given_name: 'Sara',
    family_name: 'Ali',
    role: 'analyst',
  },
  {
    id: 'floos-user-003',
    username: 'admin_ops',
    email: 'admin@floos.bh',
    password: 'admin1234',
    given_name: 'Ops',
    family_name: 'Admin',
    role: 'admin',
  },
];

function runMigrations(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      given_name TEXT NOT NULL,
      family_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS oauth_login_sessions (
      state TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS oauth_auth_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

function seedUsers(database) {
  const count = database.prepare('SELECT COUNT(*) AS total FROM users').get().total;
  if (count > 0) {
    return;
  }

  const insert = database.prepare(`
    INSERT INTO users (id, username, email, password_hash, given_name, family_name, role)
    VALUES (@id, @username, @email, @password_hash, @given_name, @family_name, @role)
  `);

  const insertMany = database.transaction((users) => {
    for (const user of users) {
      insert.run({
        id: user.id,
        username: user.username,
        email: user.email,
        password_hash: hashPassword(user.password),
        given_name: user.given_name,
        family_name: user.family_name,
        role: user.role,
      });
    }
  });

  insertMany(SEED_USERS);
}

export function initDatabase() {
  if (db) {
    return db;
  }

  const dbDir = path.dirname(path.resolve(__dirname, '..', DB_PATH));
  fs.mkdirSync(dbDir, { recursive: true });

  db = new Database(path.resolve(__dirname, '..', DB_PATH));
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations(db);
  seedUsers(db);

  return db;
}

export function getDb() {
  return initDatabase();
}
