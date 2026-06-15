import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDbPath = path.resolve(__dirname, '../../data/test-oauth.db');

process.env.OAUTH_TEST_DB = testDbPath;
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const { initDatabase } = await import('../../src/db.js');
const { authenticateUser, getUserById, listUsers } = await import('../../src/users.js');
const {
  saveLoginSession,
  bindAuthCodeToUser,
  getUserIdByAuthCode,
} = await import('../../src/oauth-sessions.js');

initDatabase();

test('users: seed data and authentication', () => {
  const users = listUsers();
  assert.ok(users.length >= 3);

  const valid = authenticateUser('ahmed_demo', 'demo1234');
  assert.equal(valid?.email, 'ahmed.demo@floos.bh');

  const invalid = authenticateUser('ahmed_demo', 'wrong-password');
  assert.equal(invalid, null);
});

test('oauth sessions: bind auth code to logged-in user', () => {
  const user = getUserById('floos-user-001');
  assert.ok(user);

  saveLoginSession('state-abc', user.id);
  const bound = bindAuthCodeToUser('code-123', 'state-abc');
  assert.equal(bound, true);
  assert.equal(getUserIdByAuthCode('code-123'), user.id);
});
