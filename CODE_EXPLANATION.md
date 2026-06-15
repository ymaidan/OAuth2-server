# OAuth2 Project — Complete Code Explanation

This document explains **every file** in `public/`, `src/`, and `tests/`: what each line does, the syntax used, the logic behind it, and why it exists in the project.

---

## Table of Contents

1. [Big Picture — How Everything Connects](#big-picture--how-everything-connects)
2. [Folder: `src/`](#folder-src)
   - [config.js](#configjs)
   - [oauth-server.js](#oauth-serverjs)
   - [oauth-client.js](#oauth-clientjs)
   - [state.js](#statejs)
   - [templates.js](#templatesjs)
   - [app-server.js](#app-serverjs)
3. [Folder: `public/`](#folder-public)
   - [index.html](#indexhtml)
   - [app.js](#appjs)
   - [style.css](#stylecss)
4. [Folder: `tests/`](#folder-tests)
   - [unit/config.test.js](#unitconfigtestjs)
   - [unit/oauth-client.test.js](#unitoauth-clienttestjs)
   - [unit/state.test.js](#unitstatetestjs)
   - [unit/templates.test.js](#unittemplatestestjs)
   - [integration/oauth-flow.test.js](#integrationoauth-flowtestjs)
5. [Glossary of Key Terms](#glossary-of-key-terms)

---

## Big Picture — How Everything Connects

This project runs **two servers**:

| Server | Port | File | Role |
|--------|------|------|------|
| OAuth mock provider | `8080` | `src/oauth-server.js` | Pretends to be Google/Auth0 — issues codes and tokens |
| Web application | `3000` | `src/app-server.js` | Your app — login button, callback, token exchange |

```text
Browser                Web App (:3000)              OAuth Server (:8080)
   |                          |                              |
   |-- GET /login ----------->|                              |
   |                          |-- redirect /authorize ------>|
   |                          |                              |
   |<------------------------- redirect /callback?code=... -|
   |                          |-- POST /token -------------->|
   |                          |<-- access_token -------------|
   |                          |-- GET /userinfo ------------>|
   |                          |<-- user profile -------------|
   |<-- success page ---------|                              |
```

**Why two servers?** In real OAuth, the identity provider (Google, etc.) is always a separate service. Splitting them here mirrors production and makes the Authorization Code flow easier to understand.

---

## Folder: `src/`

Backend logic: configuration, OAuth server, Express routes, security, and HTML rendering.

---

### `config.js`

**Purpose:** Single place for all URLs, ports, and OAuth settings. Both servers import from here so values never drift apart.

```js
export const OAUTH_HOST = 'localhost';
```
- **`export`** — Makes this constant importable in other files (ES Module syntax).
- **`const`** — Value cannot be reassigned.
- **`OAUTH_HOST`** — Hostname where the mock OAuth server listens.
- **`'localhost'`** — Your own machine; fine for local development.

```js
export const OAUTH_PORT = 8080;
```
- Port number for the OAuth mock server (required by the task: e.g. `http://localhost:8080`).

```js
export const OAUTH_BASE_URL = `http://${OAUTH_HOST}:${OAUTH_PORT}`;
```
- **Template literal** (backticks `` ` ``) — Builds a full URL string.
- **`${...}`** — Interpolation: inserts variable values into the string.
- **Result:** `'http://localhost:8080'` — Base URL used for `/authorize`, `/token`, `/userinfo`.

```js
export const APP_HOST = 'localhost';
export const APP_PORT = 3000;
export const APP_BASE_URL = `http://${APP_HOST}:${APP_PORT}`;
```
- Same pattern for the **web application** server.
- **Result:** `'http://localhost:3000'`.

```js
export const CLIENT_ID = 'floos-demo-client';
```
- **Client ID** — Public identifier of your app registered with the OAuth provider.
- Mock server accepts any client ID; a real provider would require registration.

```js
export const REDIRECT_URI = `${APP_BASE_URL}/callback`;
```
- **Redirect URI** — Where the OAuth server sends the user **after** they approve login.
- Must match exactly what you send in the authorize request.
- **Result:** `'http://localhost:3000/callback'`.

```js
export const SCOPES = 'openid profile email';
```
- **Scopes** — Permissions your app requests.
  - `openid` — OpenID Connect identity layer
  - `profile` — Name, username, etc.
  - `email` — Email address
- Space-separated string is the standard OAuth format.

---

### `oauth-server.js`

**Purpose:** Starts the mock OAuth2 / OpenID Connect identity provider using the `oauth2-mock-server` npm package.

```js
import { OAuth2Server } from 'oauth2-mock-server';
```
- **`import`** — ES Module import.
- **`{ OAuth2Server }`** — Named import: only the `OAuth2Server` class from the package.
- This class creates a fake OAuth server with `/authorize`, `/token`, `/userinfo`, etc.

```js
import { OAUTH_HOST, OAUTH_PORT } from './config.js';
```
- Imports host and port from your config.
- **`'./config.js'`** — Relative path; `.js` extension is required in Node ES modules.

```js
async function startOAuthServer() {
```
- **`async function`** — Function that can use `await` for asynchronous operations (starting server, generating keys).
- Wrapped in a named function so startup logic is organized and testable.

```js
  const server = new OAuth2Server();
```
- **`new`** — Creates an instance of the mock server.
- No config needed; defaults provide standard OAuth2/OIDC endpoints.

```js
  await server.issuer.keys.generate('RS256');
```
- **`await`** — Pauses until key generation finishes.
- **`issuer.keys.generate('RS256')`** — Creates RSA key pair for signing JWT access tokens.
- **`RS256`** — RSA + SHA-256; common algorithm for OAuth JWTs.

```js
  server.service.on('beforeUserinfo', (userInfoResponse) => {
```
- **`.on('beforeUserinfo', ...)`** — Event hook: runs **before** the server responds to `GET /userinfo`.
- **`(userInfoResponse) => { ... }`** — Arrow function callback; receives the response object to customize.

```js
    userInfoResponse.body = {
      sub: 'floos-user-001',
      name: 'Ahmed Demo',
      email: 'ahmed.demo@floos.bh',
      preferred_username: 'ahmed_demo',
      given_name: 'Ahmed',
      family_name: 'Demo',
    };
```
- **`userInfoResponse.body`** — JSON body returned to clients calling `/userinfo`.
- **Hardcoded mock data** — Correct for a demo; no real user database needed.
- **Field meanings (OpenID Connect standard claims):**
  - `sub` — Subject; unique user ID
  - `name` — Full display name
  - `email` — Email address
  - `preferred_username` — Username
  - `given_name` / `family_name` — First and last name

```js
  server.service.on('beforeTokenSigning', (token) => {
    token.payload.name = 'Ahmed Demo';
    token.payload.email = 'ahmed.demo@floos.bh';
  });
```
- **`beforeTokenSigning`** — Hook that runs before the JWT access token is signed.
- **`token.payload`** — Claims embedded inside the JWT.
- **Optional enhancement** — Puts name/email inside the token itself (not only in `/userinfo`).

```js
  await server.start(OAUTH_PORT, OAUTH_HOST);
```
- Starts HTTP server on port `8080`, host `localhost`.
- After this line, endpoints like `/authorize` and `/token` are live.

```js
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
```
- **`process.on('SIGINT', ...)`** — Listens for Ctrl+C in the terminal.
- **`server.stop()`** — Gracefully shuts down the OAuth server.
- **`process.exit(0)`** — Exits Node with code `0` (success).
- **Purpose:** Clean shutdown instead of leaving the port occupied.

```js
startOAuthServer().catch((error) => {
  if (error.code === 'EADDRINUSE') {
    process.exit(1);
  }
  process.exit(1);
});
```
- **`startOAuthServer()`** — Invokes the async function (returns a Promise).
- **`.catch(...)`** — Handles any startup failure.
- **`error.code === 'EADDRINUSE'`** — Port 8080 already in use (another process running).
- **`process.exit(1)`** — Exit with failure code.
- **Note:** No `console.log` here — errors are silent; check if port is free if server won't start.

---

### `oauth-client.js`

**Purpose:** Pure helper functions for the three OAuth HTTP steps. No Express, no UI — easy to test and reuse.

#### `buildAuthorizeUrl`

```js
export function buildAuthorizeUrl({
  oauthBaseUrl,
  clientId,
  redirectUri,
  scopes,
  state,
}) {
```
- **`export function`** — Public function other files can import.
- **`{ oauthBaseUrl, clientId, ... }`** — **Destructuring** in the parameter list: callers pass one object; the function pulls out named properties.

```js
  const authUrl = new URL(`${oauthBaseUrl}/authorize`);
```
- **`new URL(...)`** — Built-in class for parsing and building URLs safely.
- Creates URL object for `http://localhost:8080/authorize`.

```js
  authUrl.searchParams.set('response_type', 'code');
```
- **`searchParams.set(key, value)`** — Adds query string parameter.
- **`response_type=code`** — Tells OAuth server: "I want an **authorization code**" (Authorization Code flow).

```js
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
```
- **`client_id`** — Which app is requesting access.
- **`redirect_uri`** — Where to send the user back with the code.
- **`scope`** — Requested permissions.
- **`state`** — Random value for CSRF protection (validated on callback).

```js
  return authUrl.toString();
```
- Converts URL object back to a string like:
  `http://localhost:8080/authorize?response_type=code&client_id=...&...`

#### `exchangeCodeForTokens`

```js
export async function exchangeCodeForTokens({
  oauthBaseUrl,
  code,
  redirectUri,
  clientId,
}) {
```
- **`async`** — Function returns a Promise; uses `await fetch` inside.
- Exchanges the one-time **authorization code** for an **access token**.

```js
  const response = await fetch(`${oauthBaseUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    }),
  });
```
- **`fetch(...)`** — Node.js built-in HTTP client (like browser `fetch`).
- **`method: 'POST'`** — Token endpoint requires POST (OAuth spec).
- **`Content-Type: application/x-www-form-urlencoded`** — Body is form fields, not JSON.
- **`new URLSearchParams({...})`** — Builds form body:
  - `grant_type=authorization_code` — OAuth grant type
  - `code` — The code from the callback URL
  - `redirect_uri` — Must match the authorize request
  - `client_id` — App identifier
- **`code,`** — Shorthand property: `code: code`.

```js
  const data = await response.json();
```
- Parses response body as JSON (typically `{ access_token, token_type, expires_in, ... }`).

```js
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }
```
- **`response.ok`** — `true` if status 200–299.
- **`throw new Error(...)`** — Stops execution and propagates failure to the caller (`app-server.js` catch block).
- **`||`** — Fallback chain: use first truthy error message.

```js
  return data;
```
- Returns token object to the caller.

#### `fetchUserInfo`

```js
export async function fetchUserInfo(oauthBaseUrl, accessToken) {
```
- Two positional parameters (base URL and token string).

```js
  const response = await fetch(`${oauthBaseUrl}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
```
- **`GET /userinfo`** — Standard OpenID Connect endpoint for user profile.
- **`Authorization: Bearer <token>`** — Proves the request is authenticated.
- **Bearer** — Token type meaning "whoever holds this token has access."

```js
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Userinfo request failed');
  }

  return data;
```
- Same error-handling pattern as token exchange.
- Returns user profile object (name, email, sub, etc.).

---

### `state.js`

**Purpose:** CSRF protection for OAuth. Generates a random `state` before redirect, validates it when the user returns.

```js
import crypto from 'crypto';
```
- Node.js built-in cryptography module.

```js
const DEFAULT_TTL_MS = 10 * 60 * 1000;
```
- **TTL** = Time To Live.
- `10 * 60 * 1000` = 10 minutes in milliseconds.
- States older than this are rejected.

```js
export class StateStore {
```
- **`class`** — Blueprint for objects with methods and data.
- **`export`** — Other files can `import { StateStore }`.

```js
  constructor(ttlMs = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
    this.pendingStates = new Map();
  }
```
- **`constructor`** — Runs when you `new StateStore()`.
- **`ttlMs = DEFAULT_TTL_MS`** — Default parameter if caller omits TTL.
- **`this.ttlMs`** — Instance property: expiration duration.
- **`this.pendingStates = new Map()`** — In-memory map: `state string → timestamp created`.
- **Map vs Object:** `Map` is better for frequent add/delete.

```js
  create() {
    const state = crypto.randomBytes(16).toString('hex');
    this.pendingStates.set(state, Date.now());
    return state;
  }
```
- **`crypto.randomBytes(16)`** — 16 random bytes = 128 bits of entropy (unguessable).
- **`.toString('hex')`** — 32-character hex string (e.g. `a3f8b2...`).
- **`Date.now()`** — Current time in ms; stored for TTL check.
- **`set(state, timestamp)`** — Saves pending state.
- **Returns** the state string to embed in the authorize URL.

```js
  consume(state) {
    if (!state || !this.pendingStates.has(state)) {
      return false;
    }
```
- **`consume`** — Validates and **deletes** state (one-time use).
- Returns `false` if missing, empty, or unknown.

```js
    const createdAt = this.pendingStates.get(state);
    this.pendingStates.delete(state);
```
- Gets creation time, then **removes** state immediately.
- Even if validation fails below, state cannot be reused (prevents replay).

```js
    return Date.now() - createdAt < this.ttlMs;
  }
```
- **`true`** if state exists and is younger than 10 minutes.
- **`false`** if expired.

```js
  cleanup() {
    const now = Date.now();
    for (const [state, createdAt] of this.pendingStates.entries()) {
      if (now - createdAt >= this.ttlMs) {
        this.pendingStates.delete(state);
      }
    }
  }
```
- **`for...of`** — Iterates Map entries.
- **`[state, createdAt]`** — Destructuring each entry into key and value.
- Removes expired states that were never consumed (user abandoned login).
- Called every 60 seconds from `app-server.js` to prevent memory growth.

---

### `templates.js`

**Purpose:** Builds HTML pages for success and error responses. Keeps HTML out of route handlers.

#### `escapeHtml`

```js
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```
- **`String(value)`** — Coerces any input to string.
- **`.replace(/&/g, '&amp;')`** — Regex replace all (`g` flag) dangerous HTML characters.
- **Purpose:** **XSS prevention** — User-controlled or OAuth error text cannot inject `<script>` tags.

#### `pageShell`

```js
function pageShell({ title, eyebrow, heading, subtitle, body }) {
```
- **Not exported** — Internal helper used only in this file.
- Accepts page metadata and HTML body fragment.

```js
  return `<!DOCTYPE html>
<html lang="en">
...
    ${body}
  </main>
</body>
</html>`;
```
- **Template literal** — Multi-line HTML string.
- **`${escapeHtml(title)}`** etc. — Safe interpolation for dynamic text.
- **`${body}`** — Injected section (code blocks, buttons) — caller must escape its own data.
- **Shared layout** — Brand, header, stylesheet link — consistent look for success/error pages.

#### `renderSuccessPage`

```js
export function renderSuccessPage({ code, tokens, userInfo }) {
```
- Called from `/callback` after successful OAuth flow.

```js
  const tokenJson = escapeHtml(JSON.stringify(tokens, null, 2));
  const userJson = userInfo ? escapeHtml(JSON.stringify(userInfo, null, 2)) : null;
```
- **`JSON.stringify(tokens, null, 2)`** — Pretty-printed JSON with 2-space indent.
- **`userInfo ? ... : null`** — Ternary: only format user JSON if profile was fetched.
- **`escapeHtml`** — Safe to embed inside `<pre>` tags.

```js
  const body = `
    <section class="card success-card">
      <h2>Authorization Code</h2>
      ...
      <pre class="code-block">${escapeHtml(code)}</pre>
    </section>
    ...
  `;
```
- Three possible sections:
  1. **Authorization Code** — The `code` query param from callback (educational display).
  2. **Access Token** — Full token response JSON from `POST /token`.
  3. **User Profile** — Only if `userJson` is not null.

```js
    ${
      userJson
        ? `<section class="card">...</section>`
        : ''
    }
```
- **Conditional template** — Inserts user profile section only when userinfo was retrieved.

```js
    <div class="actions">
      <a href="/" class="btn btn-secondary">Home</a>
      <a href="/login" class="btn btn-primary">Sign in again</a>
    </div>`;
```
- Navigation links to restart or go home.

```js
  return pageShell({
    title: 'Login Successful — FLOOSS',
    eyebrow: 'OAuth2',
    heading: 'Login Successful',
    subtitle: 'Authorization Code flow completed',
    body,
  });
```
- Wraps body in full HTML document and returns string sent as HTTP response.

#### `renderErrorPage`

```js
export function renderErrorPage(error, description) {
```
- Used for OAuth errors, missing code, invalid state, server errors.

```js
  const body = `
    <section class="card error-card">
      <h2>${escapeHtml(error)}</h2>
      <p>${escapeHtml(description || 'Unknown error')}</p>
    </section>
    ...
  `;
```
- Shows error code and human-readable description.
- **`description || 'Unknown error'`** — Fallback if description is empty.

---

### `app-server.js`

**Purpose:** Main Express web server — serves static files, starts OAuth login, handles callback.

```js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
```
- **`express`** — Web framework for routes and middleware.
- **`path`** — Utilities for file paths (cross-platform).
- **`fileURLToPath`** — Converts `import.meta.url` to a filesystem path (ES module equivalent of `__dirname`).

```js
import {
  APP_HOST,
  APP_PORT,
  CLIENT_ID,
  OAUTH_BASE_URL,
  REDIRECT_URI,
  SCOPES,
} from './config.js';
```
- Central config values for routes and OAuth calls.

```js
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
} from './oauth-client.js';
import { StateStore } from './state.js';
import { renderErrorPage, renderSuccessPage } from './templates.js';
```
- Application modules: OAuth HTTP helpers, state store, HTML templates.

```js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
- **`import.meta.url`** — Full URL of current module file (`file:///C:/.../app-server.js`).
- **`fileURLToPath`** — Turns it into `C:\...\app-server.js`.
- **`path.dirname`** — Directory containing the file (`...\src`).
- **Why needed:** ES modules don't have `__dirname` by default (unlike CommonJS).

```js
const app = express();
const stateStore = new StateStore();
```
- **`app`** — Express application instance.
- **`stateStore`** — One shared instance for all requests (in-memory).

```js
setInterval(() => stateStore.cleanup(), 60 * 1000);
```
- **`setInterval(fn, ms)`** — Runs `cleanup` every 60,000 ms (1 minute).
- Removes expired OAuth states from memory.

```js
app.use(express.static(path.join(__dirname, '../public')));
```
- **`express.static`** — Middleware: serves files from `public/` folder.
- **`path.join(__dirname, '../public')`** — Resolves to project `public/` directory.
- Makes `/style.css`, `/app.js` available at `http://localhost:3000/style.css`, etc.

#### Route: `GET /`

```js
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});
```
- **`app.get(path, handler)`** — Handles HTTP GET requests.
- **`req`** — Request object (headers, query, etc.).
- **`res`** — Response object.
- **`res.sendFile(...)`** — Sends `index.html` (login page) as response.

#### Route: `GET /login`

```js
app.get('/login', (req, res) => {
  const state = stateStore.create();
```
- Creates fresh random `state` for this login attempt.

```js
  const authUrl = buildAuthorizeUrl({
    oauthBaseUrl: OAUTH_BASE_URL,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scopes: SCOPES,
    state,
  });
```
- Builds full authorize URL with all OAuth query parameters.

```js
  res.redirect(authUrl);
});
```
- **`res.redirect(url)`** — HTTP 302 redirect; browser navigates to OAuth server.
- User leaves your app temporarily and lands on `http://localhost:8080/authorize?...`.

#### Route: `GET /callback`

```js
app.get('/callback', async (req, res) => {
```
- **`async`** — Handler uses `await` for token and userinfo HTTP calls.
- OAuth server redirects here after user approves: `/callback?code=XXX&state=YYY`.

```js
  const { code, state, error, error_description: errorDescription } = req.query;
```
- **`req.query`** — Parsed query string parameters.
- **Destructuring** — Pulls `code`, `state`, `error` from URL.
- **`error_description: errorDescription`** — Renames long key to shorter variable.

```js
  if (error) {
    return res.status(400).send(renderErrorPage(error, errorDescription));
  }
```
- OAuth can return errors in URL (e.g. user denied consent).
- **`return`** — Stops handler; no further processing.
- **`res.status(400)`** — Bad Request HTTP status.

```js
  if (!code) {
    return res
      .status(400)
      .send(renderErrorPage('missing_code', 'No authorization code was returned.'));
  }
```
- Callback without `code` is invalid (direct visit or broken flow).

```js
  if (!stateStore.consume(state)) {
    return res
      .status(400)
      .send(
        renderErrorPage(
          'invalid_state',
          'Invalid or expired session. Please sign in again.'
        )
      );
  }
```
- **CSRF check** — `state` must match one we created in `/login` and not be expired.
- Prevents attackers from tricking users with forged callback URLs.

```js
  try {
    const tokens = await exchangeCodeForTokens({
      oauthBaseUrl: OAUTH_BASE_URL,
      code,
      redirectUri: REDIRECT_URI,
      clientId: CLIENT_ID,
    });
```
- **Server-side token exchange** — Code never handled by browser JavaScript (more secure).
- **`await`** — Waits for `POST /token` response.

```js
    let userInfo = null;
    if (tokens.access_token) {
      userInfo = await fetchUserInfo(OAUTH_BASE_URL, tokens.access_token);
    }
```
- **`let userInfo = null`** — Default if no token.
- Optional step: fetch profile from `/userinfo`.

```js
    res.send(renderSuccessPage({ code, tokens, userInfo }));
  } catch (err) {
    res.status(500).send(renderErrorPage('server_error', err.message));
  }
});
```
- **Success** — HTML page with code, tokens, and profile.
- **Catch** — Network failures, invalid code, etc. → 500 error page.
- **`err.message`** — Human-readable error from thrown `Error`.

```js
app.listen(APP_PORT, APP_HOST);
```
- Starts Express on `http://localhost:3000`.
- Blocks and keeps process running.

---

## Folder: `public/`

Frontend files served as static assets. The OAuth **logic** runs on the server; the browser mostly shows UI and follows redirects.

---

### `index.html`

**Purpose:** Login landing page with button and flow explanation.

```html
<!DOCTYPE html>
```
- Declares HTML5 document type for correct browser rendering.

```html
<html lang="en">
```
- Root element; `lang="en"` helps accessibility and search engines.

```html
<head>
  <meta charset="UTF-8" />
```
- UTF-8 encoding — supports international characters.

```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```
- Responsive mobile layout — page scales to device width.

```html
  <title>FLOOSS — OAuth2 Demo</title>
  <link rel="stylesheet" href="/style.css" />
</head>
```
- Browser tab title.
- **`href="/style.css"`** — Loads stylesheet from Express static middleware.

```html
<body>
  <main class="container">
```
- **`<main>`** — Semantic landmark for primary content.
- **`class="container"`** — CSS hook for centered max-width layout.

```html
    <div class="brand">
      <div class="brand-logo">Flooss</div>
    </div>
```
- Branding header; styled uppercase logo with orange underline (CSS `::after`).

```html
    <header class="header">
      <p class="eyebrow">OAuth2 Authorization Code Flow</p>
      <h1>Secure Sign-In</h1>
      <p class="subtitle">Authenticate through a mock OAuth2 provider</p>
    </header>
```
- Page title area.
- **`eyebrow`** — Small label above main heading (design pattern).

```html
    <section class="card login-card">
      <div class="icon" aria-hidden="true">&#128274;</div>
```
- **`<section>`** — Grouped content block.
- **`&#128274;`** — HTML entity for lock emoji 🔒.
- **`aria-hidden="true"`** — Hides decorative icon from screen readers.

```html
      <h2>Welcome</h2>
      <p>Sign in with the local OAuth2 mock server to complete the authorization flow.</p>
      <a href="/login" class="btn btn-primary" id="login-btn">Login with OAuth2</a>
    </section>
```
- **`href="/login"`** — Clicking starts OAuth (server redirect chain).
- **`id="login-btn"`** — Target for `app.js` click handler.
- Uses `<a>` not `<button>` because navigation is a link to `/login`.

```html
    <section class="card flow-card">
      <h2>Authentication Flow</h2>
      <ol class="flow-steps">
        <li>Redirect to <code>/login</code></li>
        <li>Authorize at <code>/authorize</code></li>
        <li>Return to <code>/callback</code> with a code</li>
        <li>Exchange code for an access token</li>
        <li>Fetch user profile from <code>/userinfo</code></li>
      </ol>
    </section>
```
- **`<ol>`** — Ordered list documenting the 5 OAuth steps (educational, not functional).

```html
    <p id="status-message" class="status-message" hidden></p>
```
- Empty message area; shown by JavaScript when user clicks login.
- **`hidden`** — HTML boolean attribute; element not visible until JS removes it.

```html
    <p class="footer-note">Technical assessment — Flooss Software Engineer</p>
  </main>

  <script src="/app.js"></script>
</body>
</html>
```
- Footer text.
- Loads client-side script at end of body (DOM is ready faster).

---

### `app.js`

**Purpose:** Small UX enhancement on the login page — feedback while redirecting. No OAuth secrets or token logic here.

```js
document.addEventListener('DOMContentLoaded', () => {
```
- Waits until HTML is fully parsed before running script.
- Prevents `getElementById` returning null because elements don't exist yet.

```js
  const loginBtn = document.getElementById('login-btn');
  const statusMessage = document.getElementById('status-message');
```
- **`document.getElementById`** — Finds element by `id` attribute from HTML.

```js
  if (!loginBtn) {
    return;
  }
```
- **Guard clause** — Exits safely if element missing (e.g. script loaded on wrong page).

```js
  loginBtn.addEventListener('click', () => {
```
- Runs callback when user clicks "Login with OAuth2".
- Navigation to `/login` still happens (`<a href>` default behavior).

```js
    if (statusMessage) {
      statusMessage.hidden = false;
      statusMessage.textContent = 'Redirecting to OAuth2 server...';
      statusMessage.className = 'status-message info';
    }
```
- **`hidden = false`** — Shows status paragraph.
- **`textContent`** — Sets plain text (safe, no HTML injection).
- **`className`** — Applies `info` styling (white pill from CSS).

```js
    loginBtn.classList.add('loading');
    loginBtn.textContent = 'Redirecting...';
  });
});
```
- **`classList.add('loading')`** — Dims button, disables pointer events (CSS).
- Changes button label so user sees immediate feedback.
- **Note:** Redirect is very fast; this may flash briefly — that's OK.

---

### `style.css`

**Purpose:** Flooss-branded visual design for login, success, and error pages.

#### CSS Variables (`:root`)

```css
:root {
  --flooss-cyan: #4fc3f7;
  --flooss-cyan-dark: #3ab0e5;
  --flooss-orange: #f07d22;
  ...
}
```
- **`:root`** — Global scope (applies to entire document).
- **`--name: value`** — CSS custom properties (variables).
- **Purpose:** One place to change brand colors; reused with `var(--flooss-orange)`.

#### CSS Reset

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```
- **`*`** — Universal selector (all elements).
- **`box-sizing: border-box`** — Width includes padding/border (easier layouts).
- Zero default margin/padding — consistent cross-browser starting point.

#### Body and Layout

```css
body {
  font-family: var(--font);
  background: linear-gradient(180deg, #5ec9f5 0%, var(--flooss-cyan) 45%, #45b8e8 100%);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
  padding: 2rem 1rem 3rem;
}
```
- **`linear-gradient`** — Vertical blue gradient background.
- **`min-height: 100vh`** — At least full viewport height.
- **`1.6` line-height** — Readable text spacing.

```css
.container {
  max-width: 720px;
  margin: 0 auto;
}
```
- Centers content; caps width for readability on large screens.

#### Brand Logo

```css
.brand-logo::after {
  content: '';
  position: absolute;
  ...
  background: var(--flooss-orange);
  border-radius: 999px;
}
```
- **`::after`** — Pseudo-element (decorative orange underline under "Flooss").
- **`position: absolute`** — Positioned relative to `.brand-logo` (which has `position: relative`).

#### Cards

```css
.card {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 1.75rem;
  margin-bottom: 1.25rem;
  box-shadow: var(--shadow);
}
```
- White rounded cards floating on blue background — main UI container pattern.

#### Buttons

```css
.btn {
  display: inline-block;
  padding: 0.9rem 2rem;
  border-radius: 999px;
  ...
  text-decoration: none;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}
```
- Pill-shaped buttons; work for both `<a>` and `<button>`.
- **`transition`** — Smooth hover animations.

```css
.btn-primary {
  background: var(--flooss-orange);
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(240, 125, 34, 0.35);
}
```
- Orange primary action (Login, Sign in again).

```css
.btn.loading {
  opacity: 0.75;
  pointer-events: none;
}
```
- Applied by `app.js` during redirect — visual "busy" state.

#### Code Blocks (Success Page)

```css
.code-block {
  background: var(--code-bg);
  border: 2px solid rgba(240, 125, 34, 0.25);
  border-radius: 14px;
  padding: 1rem;
  font-family: var(--mono);
  font-size: 0.8rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
```
- Styles `<pre>` blocks showing authorization code, JSON tokens, and user profile.
- **`pre-wrap`** — Preserves formatting but wraps long lines.
- **`word-break: break-all`** — Long JWT strings don't overflow container.

#### Status and Error States

```css
.success-card {
  border: 2px solid rgba(240, 125, 34, 0.35);
}

.error-card {
  border: 2px solid rgba(220, 38, 38, 0.25);
}

.error-card h2 {
  color: #dc2626;
}
```
- Visual distinction: orange border for success, red for errors.

#### Responsive Design

```css
@media (max-width: 640px) {
  .header h1 {
    font-size: 1.65rem;
  }
  ...
}
```
- **`@media`** — Rules apply only on narrow screens (phones).
- Smaller fonts and padding for mobile readability.

---

## Folder: `tests/`

Automated tests using Node.js built-in test runner (`node:test`) and `node:assert/strict`.

---

### `unit/config.test.js`

**Purpose:** Verifies `config.js` exports expected values (no typos in URLs or client ID).

```js
import test from 'node:test';
import assert from 'node:assert/strict';
```
- **`node:test`** — Built-in test framework (no Jest/Mocha needed).
- **`node:assert/strict`** — Strict equality assertions (`===`).

```js
import {
  APP_BASE_URL,
  CLIENT_ID,
  OAUTH_BASE_URL,
  REDIRECT_URI,
  SCOPES,
} from '../../src/config.js';
```
- **`../../src/`** — From `tests/unit/` up two levels, then into `src/`.

```js
test('config exports consistent OAuth settings', () => {
  assert.equal(OAUTH_BASE_URL, 'http://localhost:8080');
  assert.equal(APP_BASE_URL, 'http://localhost:3000');
  assert.equal(REDIRECT_URI, 'http://localhost:3000/callback');
  assert.equal(CLIENT_ID, 'floos-demo-client');
  assert.match(SCOPES, /openid/);
});
```
- **`test(name, fn)`** — Defines one test case.
- **`assert.equal(a, b)`** — `a === b` or test fails.
- **`assert.match(string, /openid/)`** — String contains "openid".

---

### `unit/oauth-client.test.js`

**Purpose:** Tests `buildAuthorizeUrl` builds correct OAuth authorize URL.

```js
test('buildAuthorizeUrl creates a valid authorization request', () => {
  const url = buildAuthorizeUrl({ ... });
  const parsed = new URL(url);

  assert.equal(parsed.origin, 'http://localhost:8080');
  assert.equal(parsed.pathname, '/authorize');
  assert.equal(parsed.searchParams.get('response_type'), 'code');
  ...
});
```
- Calls function with known inputs.
- **`new URL(url)`** — Parses result for structured assertions.
- **`searchParams.get('state')`** — Checks each OAuth query parameter.
- Does **not** hit real server — pure function test.

---

### `unit/state.test.js`

**Purpose:** Tests CSRF state store logic in isolation.

| Test | What it verifies |
|------|------------------|
| `create returns a unique state value` | State is 32 hex chars; two calls differ |
| `consume accepts a valid state once` | First consume `true`, second `false` (one-time use) |
| `consume rejects unknown state` | Random string returns `false` |
| `consume rejects expired state` | TTL of 1ms → after 5ms, consume fails |
| `cleanup removes expired entries` | Map empty after expiry + cleanup |

```js
assert.match(first, /^[a-f0-9]{32}$/);
```
- **Regex** — Exactly 32 lowercase hex characters.

```js
return new Promise((resolve) => {
  setTimeout(() => {
    assert.equal(store.consume(state), false);
    resolve();
  }, 5);
});
```
- **Async test pattern** — `setTimeout` waits for TTL to expire before asserting.
- **`resolve()`** — Tells test runner the async test finished.

---

### `unit/templates.test.js`

**Purpose:** Tests HTML rendering and XSS escaping.

```js
test('escapeHtml sanitizes dangerous characters', () => {
  const input = `<script>alert("xss")</script>`;
  const output = escapeHtml(input);

  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /&lt;script&gt;/);
});
```
- Ensures `<` becomes `&lt;` etc. — no executable script in HTML.

```js
test('renderSuccessPage includes code, token, and user info', () => {
  const html = renderSuccessPage({ ... });
  assert.match(html, /Login Successful/);
  assert.match(html, /auth-code-123/);
  ...
});
```
- Success template contains expected strings.

```js
test('renderSuccessPage omits user section when userInfo is null', () => {
  assert.doesNotMatch(html, /User Profile/);
});
```
- Conditional user block works when profile is missing.

```js
test('renderErrorPage escapes error content', () => {
  const html = renderErrorPage('<bad>', '<script>alert(1)</script>');
  assert.doesNotMatch(html, /<script>alert/);
});
```
- Error page also safe from XSS.

---

### `integration/oauth-flow.test.js`

**Purpose:** End-to-end tests against **running** servers on ports 3000 and 8080.

```js
const OAUTH = 'http://localhost:8080';
const APP = 'http://localhost:3000';
```
- Hardcoded URLs matching `config.js`.

```js
async function isServerUp(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}
```
- **`try/catch`** — Network error (server down) returns `false`, not crash.
- **`res.ok`** — HTTP 2xx means server is reachable.

```js
test('integration: oauth and app servers are reachable', async (t) => {
  ...
  if (!oauthUp || !appUp) {
    t.skip('Start both servers with npm run start:oauth and npm run start:app');
    return;
  }
  ...
});
```
- **`t.skip(...)`** — Skips test gracefully if servers aren't running.
- Avoids false failures when developer only runs `npm test` without servers.

```js
test('integration: login redirects to authorize endpoint', async (t) => {
  const res = await fetch(`${APP}/login`, { redirect: 'manual' });
  const location = res.headers.get('location') || '';
  ...
  assert.equal(res.status, 302);
  assert.equal(parsed.pathname, '/authorize');
});
```
- **`redirect: 'manual'`** — Fetch does NOT follow redirect; you inspect `Location` header.
- Verifies `/login` → 302 → OAuth `/authorize` URL.

```js
test('integration: full OAuth flow returns token and user info', async (t) => {
  const res = await fetch(`${APP}/login`, { redirect: 'follow' });
  const html = await res.text();

  assert.match(html, /Login Successful/);
  assert.match(html, /access_token/);
  assert.match(html, /Ahmed Demo/);
});
```
- **`redirect: 'follow'`** — Browser-like: follows all redirects through full OAuth flow.
- Mock server auto-approves; ends on success HTML page.
- Confirms token and mock user name appear.

```js
test('integration: callback without code returns error page', async (t) => {
  const res = await fetch(`${APP}/callback`);
  assert.equal(res.status, 400);
  assert.match(html, /missing_code/);
});
```
- Direct `/callback` visit without `code` → proper error handling.

---

## Glossary of Key Terms

| Term | Meaning |
|------|---------|
| **Authorization Code** | Short-lived one-time code returned in callback URL; exchanged for tokens |
| **Access Token** | Credential used to call protected APIs (e.g. `/userinfo`) |
| **Bearer Token** | Token sent in `Authorization: Bearer ...` header |
| **Client ID** | Public identifier for your application |
| **Redirect URI** | Allowed callback URL registered with OAuth provider |
| **Scope** | Permissions requested (profile, email, etc.) |
| **State** | Random value preventing CSRF on OAuth callback |
| **CSRF** | Cross-Site Request Forgery — attacker tricks user into unwanted actions |
| **JWT** | JSON Web Token — signed token format used by many OAuth servers |
| **OIDC** | OpenID Connect — identity layer on top of OAuth2 (`openid` scope) |
| **ES Module** | `import`/`export` syntax (`"type": "module"` in package.json) |
| **Middleware** | Express function that runs before route handlers (e.g. `express.static`) |

---

## Quick Reference — Which File Does What?

| File | One-line summary |
|------|------------------|
| `config.js` | Shared URLs, ports, client ID, scopes |
| `oauth-server.js` | Mock identity provider on port 8080 |
| `oauth-client.js` | Build authorize URL, exchange code, fetch userinfo |
| `state.js` | Generate and validate OAuth `state` (CSRF) |
| `templates.js` | HTML success/error pages with escaped output |
| `app-server.js` | Express app: `/`, `/login`, `/callback` |
| `index.html` | Login page UI |
| `app.js` | Button loading state on click |
| `style.css` | Flooss branding and layout |
| `tests/unit/*.js` | Fast isolated logic tests |
| `tests/integration/*.js` | Full flow tests (servers must be running) |

---

*Generated for the Flooss OAuth2 technical assessment project.*
