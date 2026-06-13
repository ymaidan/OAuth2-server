import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuthorizeUrl } from '../../src/oauth-client.js';

test('buildAuthorizeUrl creates a valid authorization request', () => {
  const url = buildAuthorizeUrl({
    oauthBaseUrl: 'http://localhost:8080',
    clientId: 'demo-client',
    redirectUri: 'http://localhost:3000/callback',
    scopes: 'openid profile email',
    state: 'abc123',
  });

  const parsed = new URL(url);

  assert.equal(parsed.origin, 'http://localhost:8080');
  assert.equal(parsed.pathname, '/authorize');
  assert.equal(parsed.searchParams.get('response_type'), 'code');
  assert.equal(parsed.searchParams.get('client_id'), 'demo-client');
  assert.equal(parsed.searchParams.get('redirect_uri'), 'http://localhost:3000/callback');
  assert.equal(parsed.searchParams.get('scope'), 'openid profile email');
  assert.equal(parsed.searchParams.get('state'), 'abc123');
});
