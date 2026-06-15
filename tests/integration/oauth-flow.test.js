import test from 'node:test';
import assert from 'node:assert/strict';

const OAUTH = 'http://localhost:8080';
const APP = 'http://localhost:3000';

async function isServerUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

test('integration: oauth and app servers are reachable', async (t) => {
  const oauthUp = await isServerUp(`${OAUTH}/.well-known/openid-configuration`);
  const appUp = await isServerUp(`${APP}/`);

  if (!oauthUp || !appUp) {
    t.skip('Start both servers with npm run start:oauth and npm run start:app');
    return;
  }

  assert.ok(oauthUp);
  assert.ok(appUp);
});

test('integration: login page is shown before OAuth redirect', async (t) => {
  const appUp = await isServerUp(`${APP}/`);
  if (!appUp) {
    t.skip('Start app server with npm run start:app');
    return;
  }

  const res = await fetch(`${APP}/login`, { redirect: 'manual' });
  const html = await res.text();

  assert.equal(res.status, 200);
  assert.match(html, /Sign in/);
  assert.match(html, /ahmed_demo/);
});

test('integration: database login redirects to authorize endpoint', async (t) => {
  const appUp = await isServerUp(`${APP}/`);
  if (!appUp) {
    t.skip('Start app server with npm run start:app');
    return;
  }

  const res = await fetch(`${APP}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: 'ahmed_demo',
      password: 'demo1234',
    }),
    redirect: 'manual',
  });

  const location = res.headers.get('location') || '';
  const parsed = new URL(location);

  assert.equal(res.status, 302);
  assert.equal(parsed.origin, OAUTH);
  assert.equal(parsed.pathname, '/authorize');
  assert.equal(parsed.searchParams.get('response_type'), 'code');
});

test('integration: full OAuth flow returns token and user info', async (t) => {
  const oauthUp = await isServerUp(`${OAUTH}/.well-known/openid-configuration`);
  const appUp = await isServerUp(`${APP}/`);

  if (!oauthUp || !appUp) {
    t.skip('Start both servers before running integration tests');
    return;
  }

  const res = await fetch(`${APP}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: 'ahmed_demo',
      password: 'demo1234',
    }),
    redirect: 'follow',
  });
  const html = await res.text();

  assert.match(html, /Login Successful/);
  assert.match(html, /access_token/);
  assert.match(html, /Ahmed Demo/);
});

test('integration: callback without code returns error page', async (t) => {
  const appUp = await isServerUp(`${APP}/`);
  if (!appUp) {
    t.skip('Start app server with npm run start:app');
    return;
  }

  const res = await fetch(`${APP}/callback`);
  const html = await res.text();

  assert.equal(res.status, 400);
  assert.match(html, /missing_code/);
});
