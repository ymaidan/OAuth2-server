/**
 * Requirements test suite — Floos OAuth2 assessment
 * Run: node test-requirements.js
 * (Both servers must be running: start:oauth + start:app)
 */

const OAUTH = 'http://localhost:8080';
const APP = 'http://localhost:3000';

const results = [];

function pass(id, name, detail = '') {
  results.push({ id, name, status: 'PASS', detail });
  console.log(`  ✅ PASS  ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(id, name, detail = '') {
  results.push({ id, name, status: 'FAIL', detail });
  console.log(`  ❌ FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fetchText(url, options = {}) {
  const res = await fetch(url, { redirect: 'manual', ...options });
  const text = await res.text();
  return { res, text };
}

// --- Requirement tests ---

async function testOAuthServerRunning() {
  const { res } = await fetchText(`${OAUTH}/.well-known/openid-configuration`);
  if (res.status === 200) {
    pass('R1', 'Mock OAuth2 server running on http://localhost:8080');
  } else {
    fail('R1', 'Mock OAuth2 server running on http://localhost:8080', `status ${res.status}`);
  }
}

async function testAuthorizationCodeFlowConfig() {
  const { res, text } = await fetchText(`${OAUTH}/.well-known/openid-configuration`);
  if (res.status !== 200) {
    fail('R2', 'Authorization Code flow configured', 'could not fetch openid-configuration');
    return;
  }
  const config = JSON.parse(text);
  const hasAuthorize = config.authorization_endpoint?.includes('/authorize');
  const hasToken = config.token_endpoint?.includes('/token');
  if (hasAuthorize && hasToken) {
    pass('R2', 'Authorization Code flow configured', 'authorize + token endpoints present');
  } else {
    fail('R2', 'Authorization Code flow configured', JSON.stringify(config));
  }
}

async function testFrontendUI() {
  const { res, text } = await fetchText(`${APP}/`);
  if (res.status !== 200) {
    fail('R3', 'Minimal frontend UI loads', `status ${res.status}`);
    return;
  }
  const hasHtml = text.includes('<!DOCTYPE html>') || text.includes('<html');
  const hasCss = text.includes('style.css');
  if (hasHtml) {
    pass('R3', 'Minimal frontend UI loads', 'HTML page served');
  } else {
    fail('R3', 'Minimal frontend UI loads');
  }
  if (hasCss) {
    pass('R3b', 'Frontend has styling', 'style.css linked');
  }
}

async function testLoginButton() {
  const { text } = await fetchText(`${APP}/`);
  if (text.includes('Login with OAuth2')) {
    pass('R4', 'Login with OAuth2 button exists');
  } else {
    fail('R4', 'Login with OAuth2 button exists');
  }
  if (text.includes('href="/login"')) {
    pass('R4b', 'Login button links to /login');
  } else {
    fail('R4b', 'Login button links to /login');
  }
}

async function testLoginRedirectsToAuthorize() {
  const { res } = await fetchText(`${APP}/login`);
  if (res.status !== 302) {
    fail('R5', 'Login redirects to authorize endpoint', `expected 302, got ${res.status}`);
    return;
  }
  const location = res.headers.get('location') || '';
  const url = new URL(location);

  if (url.origin === OAUTH && url.pathname === '/authorize') {
    pass('R5', 'Login redirects to mock server /authorize', location.slice(0, 80) + '...');
  } else {
    fail('R5', 'Login redirects to mock server /authorize', location);
    return;
  }

  const checks = [
    ['response_type', 'code'],
    ['client_id', 'floos-demo-client'],
    ['redirect_uri', `${APP}/callback`],
    ['scope', 'openid profile email'],
  ];

  for (const [key, expected] of checks) {
    const val = url.searchParams.get(key);
    if (val === expected) {
      pass('R5-' + key, `Authorize URL has ${key}=${expected}`);
    } else {
      fail('R5-' + key, `Authorize URL has ${key}=${expected}`, `got ${val}`);
    }
  }

  if (url.searchParams.get('state')?.length >= 16) {
    pass('R5-state', 'Authorize URL includes state (CSRF protection)');
  } else {
    fail('R5-state', 'Authorize URL includes state');
  }
}

async function testAuthorizeReturnsCode() {
  // Get a fresh login redirect
  const loginRes = await fetch(`${APP}/login`, { redirect: 'manual' });
  const authUrl = loginRes.headers.get('location');
  const authRes = await fetch(authUrl, { redirect: 'manual' });

  if (authRes.status !== 302) {
    fail('R6', 'OAuth server redirects back with code', `authorize returned ${authRes.status}`);
    return;
  }

  const callbackUrl = authRes.headers.get('location') || '';
  const parsed = new URL(callbackUrl);

  if (parsed.pathname === '/callback' && parsed.searchParams.get('code')) {
    pass('R6', 'OAuth server redirects back with code in URL', `code=${parsed.searchParams.get('code').slice(0, 20)}...`);
  } else {
    fail('R6', 'OAuth server redirects back with code in URL', callbackUrl);
  }
}

async function testFullFlowTokenDisplay() {
  const res = await fetch(`${APP}/login`, { redirect: 'follow' });
  const text = await res.text();

  const checks = [
    ['Login Successful', 'Success page title'],
    ['Step 1 — Authorization Code', 'Authorization code displayed'],
    ['Step 2 — Token Response', 'Token response displayed'],
    ['access_token', 'Access token in response'],
    ['Bearer', 'Token type Bearer'],
  ];

  for (const [needle, label] of checks) {
    if (text.includes(needle)) {
      pass('R7-' + label, label);
    } else {
      fail('R7-' + label, label);
    }
  }
}

async function testUserInfoOptional() {
  const res = await fetch(`${APP}/login`, { redirect: 'follow' });
  const text = await res.text();

  const checks = [
    ['Step 3 — User Info', 'User info section displayed'],
    ['Ahmed Demo', 'Mock user name displayed'],
    ['ahmed.demo@floos.bh', 'Mock user email displayed'],
  ];

  for (const [needle, label] of checks) {
    if (text.includes(needle)) {
      pass('R8-' + label, label);
    } else {
      fail('R8-' + label, label);
    }
  }
}

// --- Error / edge-case scenarios ---

async function testCallbackMissingCode() {
  const { res, text } = await fetchText(`${APP}/callback`);
  if (res.status === 400 && text.includes('missing_code')) {
    pass('E1', 'Error handling: callback without code', 'returns 400');
  } else {
    fail('E1', 'Error handling: callback without code', `status ${res.status}`);
  }
}

async function testCallbackInvalidState() {
  const { res, text } = await fetchText(`${APP}/callback?code=fake-code&state=invalid-state`);
  if (res.status === 400 && text.includes('invalid_state')) {
    pass('E2', 'Error handling: invalid state rejected', 'CSRF protection works');
  } else {
    fail('E2', 'Error handling: invalid state rejected', `status ${res.status}`);
  }
}

async function testOAuthEndpoints() {
  const endpoints = [
    ['GET', '/jwks', 200],
    ['GET', '/userinfo', [200, 401]], // mock server may return 200 or 401 without token
  ];

  for (const [method, path, expectedStatuses] of endpoints) {
    const expected = Array.isArray(expectedStatuses) ? expectedStatuses : [expectedStatuses];
    const res = await fetch(`${OAUTH}${path}`, { method });
    if (expected.includes(res.status)) {
      pass('EP' + path, `OAuth endpoint ${method} ${path}`, `status ${res.status}`);
    } else {
      fail('EP' + path, `OAuth endpoint ${method} ${path}`, `expected ${expected.join('|')}, got ${res.status}`);
    }
  }
}

async function testDeliverables() {
  const fs = await import('fs');
  const path = await import('path');
  const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));

  const requiredFiles = [
    'package.json',
    'src/oauth-server.js',
    'src/app-server.js',
    'src/config.js',
    'public/index.html',
    'public/style.css',
  ];

  for (const file of requiredFiles) {
    const full = path.join(root, file);
    if (fs.existsSync(full)) {
      pass('D-' + file, `Deliverable file exists: ${file}`);
    } else {
      fail('D-' + file, `Deliverable file exists: ${file}`);
    }
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (pkg.devDependencies?.['oauth2-mock-server']) {
    pass('D-oauth2-mock-server', 'oauth2-mock-server in package.json');
  } else {
    fail('D-oauth2-mock-server', 'oauth2-mock-server in package.json');
  }
}

// --- Run all ---

async function main() {
  console.log('\n========================================');
  console.log('  Floos OAuth2 — Requirements Test Suite');
  console.log('========================================\n');

  console.log('REQUIREMENTS\n');
  await testOAuthServerRunning();
  await testAuthorizationCodeFlowConfig();
  await testFrontendUI();
  await testLoginButton();
  await testLoginRedirectsToAuthorize();
  await testAuthorizeReturnsCode();
  await testFullFlowTokenDisplay();
  await testUserInfoOptional();

  console.log('\nDELIVERABLES\n');
  await testDeliverables();

  console.log('\nERROR SCENARIOS\n');
  await testCallbackMissingCode();
  await testCallbackInvalidState();
  await testOAuthEndpoints();

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n========================================');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');

  if (failed === 0) {
    console.log('  🎉 ALL REQUIREMENTS PASSED — ready to submit!\n');
    process.exit(0);
  } else {
    console.log('  ⚠️  Some tests failed. See details above.\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test suite crashed:', err.message);
  console.error('\nMake sure both servers are running:');
  console.error('  Terminal 1: npm run start:oauth');
  console.error('  Terminal 2: npm run start:app\n');
  process.exit(1);
});
