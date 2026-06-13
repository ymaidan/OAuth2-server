/**
 * Web Application Server
 * ----------------------
 * This is YOUR app — the thing the user actually visits.
 * It runs on http://localhost:3000 and implements the client side
 * of the OAuth2 Authorization Code flow.
 *
 * Flow handled by this server:
 *   1. User visits /           → sees login page
 *   2. User clicks login       → GET /login redirects to OAuth /authorize
 *   3. OAuth server redirects  → GET /callback?code=...&state=...
 *   4. We exchange code        → POST to OAuth /token
 *   5. We fetch user profile   → GET OAuth /userinfo (optional bonus)
 *   6. We show results         → HTML page with code, token, and user info
 *
 * Run: npm run start:app
 * (Make sure oauth-server.js is already running on port 8080)
 */

import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  APP_HOST,
  APP_PORT,
  CLIENT_ID,
  OAUTH_BASE_URL,
  REDIRECT_URI,
  SCOPES,
} from './config.js';

// ES modules don't have __dirname — recreate it for static file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/**
 * In-memory store for OAuth "state" values (CSRF protection).
 * Key = state string, Value = timestamp when it was created.
 * In production you'd use Redis or an encrypted session cookie.
 */
const pendingStates = new Map();

/** State tokens expire after 10 minutes */
const STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Generate a random state string and remember it temporarily.
 * OAuth2 best practice: send state to /authorize, verify it on /callback
 * so attackers can't trick users into using stolen authorization codes.
 */
function createState() {
  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now());
  return state;
}

/** Returns true if state is valid and not expired; removes it after use (one-time). */
function consumeState(state) {
  if (!state || !pendingStates.has(state)) {
    return false;
  }

  const createdAt = pendingStates.get(state);
  pendingStates.delete(state);

  return Date.now() - createdAt < STATE_TTL_MS;
}

/** Remove expired state entries periodically */
function cleanupExpiredStates() {
  const now = Date.now();
  for (const [state, createdAt] of pendingStates.entries()) {
    if (now - createdAt >= STATE_TTL_MS) {
      pendingStates.delete(state);
    }
  }
}

setInterval(cleanupExpiredStates, 60 * 1000);

// Serve static files (HTML, CSS, JS) from the /public folder
app.use(express.static(path.join(__dirname, '../public')));

/**
 * GET /
 * Serves index.html from /public — the page with the "Login with OAuth2" button.
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * GET /login
 * Step 1 of OAuth flow: redirect the user's browser to the OAuth authorize endpoint.
 *
 * The browser (not our server) talks to localhost:8080 — this is intentional.
 * OAuth login pages must be shown by the identity provider, not embedded in your app.
 */
app.get('/login', (req, res) => {
  const state = createState();

  // Build the authorization URL with required OAuth2 query parameters
  const authUrl = new URL(`${OAUTH_BASE_URL}/authorize`);
  authUrl.searchParams.set('response_type', 'code'); // we want an authorization code
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);

  // HTTP 302 redirect — browser navigates to the OAuth server
  res.redirect(authUrl.toString());
});

/**
 * Exchange authorization code for tokens.
 * This is a server-to-server call (our Node app → OAuth mock server).
 * Never do this in frontend JavaScript — the token endpoint must stay on the backend.
 */
async function exchangeCodeForTokens(code) {
  const response = await fetch(`${OAUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  return data;
}

/**
 * Fetch user profile from the OAuth userinfo endpoint.
 * Requires a valid access_token in the Authorization header.
 */
async function fetchUserInfo(accessToken) {
  const response = await fetch(`${OAUTH_BASE_URL}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Userinfo request failed');
  }

  return data;
}

/** Escape HTML to prevent XSS when rendering user-controlled strings */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * GET /callback
 * Step 2 of OAuth flow: OAuth server redirects here with ?code=...&state=...
 *
 * We validate state, exchange the code for tokens, optionally fetch userinfo,
 * then render a results page.
 */
app.get('/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  // User denied access or OAuth server returned an error
  if (error) {
    return res.status(400).send(renderErrorPage(error, errorDescription));
  }

  if (!code) {
    return res.status(400).send(renderErrorPage('missing_code', 'No authorization code was returned.'));
  }

  if (!consumeState(state)) {
    return res.status(400).send(renderErrorPage('invalid_state', 'State mismatch — possible CSRF attack or expired session. Try logging in again.'));
  }

  try {
    // Step 3: exchange the one-time authorization code for access tokens
    const tokens = await exchangeCodeForTokens(code);

    // Step 4 (optional): use access_token to get user profile
    let userInfo = null;
    if (tokens.access_token) {
      userInfo = await fetchUserInfo(tokens.access_token);
    }

    res.send(renderSuccessPage({ code, tokens, userInfo }));
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send(renderErrorPage('server_error', err.message));
  }
});

/**
 * Render the success page showing authorization code, tokens, and user info.
 * We build HTML on the server so tokens never appear in the browser URL bar.
 */
function renderSuccessPage({ code, tokens, userInfo }) {
  const tokenJson = escapeHtml(JSON.stringify(tokens, null, 2));
  const userJson = userInfo ? escapeHtml(JSON.stringify(userInfo, null, 2)) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login Successful — OAuth2 Demo</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="container">
    <header class="header">
      <h1>Login Successful</h1>
      <p class="subtitle">OAuth2 Authorization Code flow completed</p>
    </header>

    <section class="card success-card">
      <h2>Step 1 — Authorization Code</h2>
      <p class="hint">Returned by the OAuth server in the redirect URL (single-use, short-lived).</p>
      <pre class="code-block">${escapeHtml(code)}</pre>
    </section>

    <section class="card">
      <h2>Step 2 — Token Response</h2>
      <p class="hint">Received after exchanging the code at POST /token.</p>
      <pre class="code-block">${tokenJson}</pre>
    </section>

    ${
      userJson
        ? `<section class="card">
      <h2>Step 3 — User Info</h2>
      <p class="hint">Fetched from GET /userinfo using the access token.</p>
      <pre class="code-block">${userJson}</pre>
    </section>`
        : ''
    }

    <div class="actions">
      <a href="/" class="btn btn-secondary">Back to Home</a>
      <a href="/login" class="btn btn-primary">Login Again</a>
    </div>
  </main>
</body>
</html>`;
}

/** Simple error page when OAuth flow fails */
function renderErrorPage(error, description) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OAuth Error</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="container">
    <header class="header">
      <h1>Authentication Failed</h1>
      <p class="subtitle">Something went wrong during the OAuth2 flow</p>
    </header>

    <section class="card error-card">
      <h2>${escapeHtml(error)}</h2>
      <p>${escapeHtml(description || 'Unknown error')}</p>
    </section>

    <div class="actions">
      <a href="/" class="btn btn-secondary">Back to Home</a>
      <a href="/login" class="btn btn-primary">Try Again</a>
    </div>
  </main>
</body>
</html>`;
}

app.listen(APP_PORT, APP_HOST, () => {
  console.log('========================================');
  console.log('  Web Application is running');
  console.log(`  Open: http://${APP_HOST}:${APP_PORT}`);
  console.log('========================================');
  console.log('  Make sure OAuth server is running:');
  console.log('    npm run start:oauth');
  console.log('========================================\n');
});
