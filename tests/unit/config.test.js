import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_BASE_URL,
  CLIENT_ID,
  OAUTH_BASE_URL,
  REDIRECT_URI,
  SCOPES,
} from '../../src/config.js';

test('config exports consistent OAuth settings', () => {
  assert.equal(OAUTH_BASE_URL, 'http://localhost:8080');
  assert.equal(APP_BASE_URL, 'http://localhost:3000');
  assert.equal(REDIRECT_URI, 'http://localhost:3000/callback');
  assert.equal(CLIENT_ID, 'floos-demo-client');
  assert.match(SCOPES, /openid/);
});
