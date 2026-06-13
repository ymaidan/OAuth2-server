# OAuth2 Assessment Guide — Floos Coding Task

A complete plan and explanation for the OAuth2 authentication flow assessment. Use this document to understand the concepts, implement the project in one day, and explain your work in the interview.

**Repository:** [ymaidan/OAuth2-server](https://github.com/ymaidan/OAuth2-server.git)

---

## Table of Contents

1. [What They Are Testing](#1-what-they-are-testing)
2. [OAuth2 in Plain Language](#2-oauth2-in-plain-language)
3. [Authorization Code Flow — Step by Step](#3-authorization-code-flow--step-by-step)
4. [What oauth2-mock-server Does](#4-what-oauth2-mock-server-does)
5. [Recommended Project Architecture](#5-recommended-project-architecture)
6. [Logic Flow in Your Code](#6-logic-flow-in-your-code)
7. [Code Concepts Explained](#7-code-concepts-explained)
8. [One-Day Schedule](#8-one-day-schedule)
9. [Dependencies & Setup](#9-dependencies--setup)
10. [Deliverables Checklist](#10-deliverables-checklist)
11. [Production vs Demo](#11-production-vs-demo)
12. [Connection to Floos Role](#12-connection-to-floos-role)
13. [Common Errors and Fixes](#13-common-errors-and-fixes)

---

## 1. What They Are Testing

| Task requirement | What Floos is evaluating |
|---|---|
| OAuth2 Authorization Code flow | Can you integrate with external auth APIs? |
| Mock server instead of Google/GitHub | Can you work with specs/endpoints without hand-holding? |
| Login button + redirect + code in URL | Do you understand the browser side of OAuth? |
| Optional: userinfo with access token | Do you understand tokens and protected API calls? |
| Node.js + GitHub | Matches their stack expectations (JS, Git, APIs) |

You do **not** need production-grade security for this demo. You **do** need to show you understand the **flow, endpoints, and data exchanged at each step**.

### Task requirements (summary)

- Set up the mock OAuth2 server using the [oauth2-mock-server](https://www.npmjs.com/package/oauth2-mock-server) npm package
- Configure the server to simulate a standard OAuth2 Authorization Code flow
- Start the server locally (e.g. `http://localhost:8080`)
- Build a minimal frontend UI with a **"Login with OAuth2"** button
- When clicked, redirect the user to the mock server's authorize endpoint
- After successful authorization, the mock server should redirect back with a `code` in the URL
- **Optional:** Call the mock server's userinfo endpoint with the access token and display mock user information

### Deliverables

- Node.js project with:
  - `oauth2-mock-server` running locally
  - Simple frontend HTML page with a login button and a token display
  - Optional: upload all files to GitHub

---

## 2. OAuth2 in Plain Language

**Problem OAuth solves:** Your app should not ask users for their Google/Floos password directly. Instead:

1. User clicks "Login"
2. They are sent to a **trusted auth server** (Identity Provider)
3. User approves access
4. Auth server sends your app a **short-lived authorization code**
5. Your app exchanges that code for an **access token**
6. Your app uses the token to call APIs (e.g. user profile)

### Key actors

```
┌──────────┐         ┌─────────────────┐         ┌──────────────────┐
│   User   │         │   Your Web App  │         │  OAuth2 Server   │
│ (Browser)│         │ localhost:3000  │         │ localhost:8080   │
└────┬─────┘         └────────┬────────┘         └────────┬─────────┘
     │                        │                           │
     │  1. Click "Login"      │                           │
     │───────────────────────>│                           │
     │                        │  2. Redirect to /authorize│
     │                        │──────────────────────────>│
     │                        │                           │
     │  3. Auto-approve (mock)│                           │
     │<───────────────────────────────────────────────────│
     │                        │                           │
     │  4. Redirect /callback?code=ABC                     │
     │───────────────────────>│                           │
     │                        │  5. POST /token (exchange)│
     │                        │──────────────────────────>│
     │                        │  6. access_token          │
     │                        │<──────────────────────────│
     │                        │  7. GET /userinfo (opt.)  │
     │                        │──────────────────────────>│
     │  8. Show token + user  │                           │
     │<───────────────────────│                           │
```

---

## 3. Authorization Code Flow — Step by Step

This is the flow your task requires. Reference: [OAuth 2.0 specification](https://oauth.net/2/).

### Step 1 — User starts login

Your frontend builds a URL like:

```
http://localhost:8080/authorize?
  response_type=code
  &client_id=my-client
  &redirect_uri=http://localhost:3000/callback
  &scope=openid profile email
  &state=random-xyz
```

| Parameter            | Meaning                                                |
| ----------------------| --------------------------------------------------------|
| `response_type=code` | "Give me an authorization code" (not a token directly) |
| `client_id`          | Identifies your app to the auth server                 |
| `redirect_uri`       | Where to send the user back after login                |
| `scope`              | What permissions you want                              |
| `state`              | Random value to prevent CSRF attacks                   |

### Step 2 — Mock server redirects back

After "login", the browser lands on:

```
http://localhost:3000/callback?code=AUTH_CODE_HERE&state=random-xyz
```

Your app must:

- Verify `state` matches what you sent
- Read `code` from the URL

### Step 3 — Exchange code for token

Your app calls:

```http
POST http://localhost:8080/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE_HERE
&redirect_uri=http://localhost:3000/callback
&client_id=my-client
```

Response (simplified):

```json
{
  "access_token": "eyJhbG...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Step 4 (optional) — Get user info

```http
GET http://localhost:8080/userinfo
Authorization: Bearer eyJhbG...
```

Returns mock user claims (name, email, etc.).

---

## 4. What oauth2-mock-server Does

Package: [oauth2-mock-server on npm](https://www.npmjs.com/package/oauth2-mock-server)

It simulates a real OAuth/OIDC provider locally. Important endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /authorize` | Fake login → redirects with `code` |
| `POST /token` | Exchanges `code` → `access_token` |
| `GET /userinfo` | Returns user profile for a valid token |
| `GET /.well-known/openid-configuration` | Discovery metadata |

### Minimal server startup

```javascript
import { OAuth2Server } from 'oauth2-mock-server';

const server = new OAuth2Server();
await server.issuer.keys.generate('RS256');  // signing keys for JWT tokens
await server.start(8080, 'localhost');
console.log('OAuth server:', server.issuer.url); // http://localhost:8080
```

### Syntax notes

| Syntax | Meaning |
|---|---|
| `import` | ES modules (modern Node.js) |
| `await` | Wait for async operations (key generation, server start) |
| `issuer.keys.generate('RS256')` | Create RSA keys to sign JWT access tokens |
| `server.start(8080, 'localhost')` | Listen on port 8080 |

### Supported grant types (relevant to this task)

- Authorization Code grant (with PKCE support)
- Client Credentials grant
- Refresh token grant
- Resource Owner Password Credentials grant

---

## 5. Recommended Project Architecture

Use **two local servers**:

```
OAuth2/
├── package.json
├── README.md
├── OAUTH2-ASSESSMENT-GUIDE.md   ← this file
├── src/
│   ├── oauth-server.js          # Mock OAuth on :8080
│   └── app-server.js            # Your app on :3000
└── public/
    ├── index.html               # Login page
    ├── callback.html            # Or handle via app-server route
    ├── app.js                   # Frontend logic
    └── style.css                # Simple UI
```

### Why two servers?

| Server | Port | Role |
|---|---|---|
| `oauth-server.js` | 8080 | Pretends to be Google/Floos IDP |
| `app-server.js` | 3000 | Your actual web app |

This mirrors real life: the auth provider is separate from your application.

### Why a small backend (`app-server.js`)?

- **Minimum task:** show `code` in the URL → frontend-only is enough
- **Optional userinfo (recommended):** you need `access_token`. Token exchange should happen on the **backend** in production (client secret must not live in the browser). For this mock demo, backend exchange is still the right pattern to show Floos.

---

## 6. Logic Flow in Your Code

### A. `oauth-server.js` — starts mock auth

```
START
  → create OAuth2Server()
  → generate signing keys
  → start on port 8080
  → keep process alive
END
```

### B. `app-server.js` — your web app

```
START Express on 3000
  → serve static files from /public
  → GET /login → redirect user to OAuth /authorize URL
  → GET /callback → read ?code=... from URL
      → POST to http://localhost:8080/token
      → (optional) GET /userinfo with Bearer token
      → render HTML page with token + user data
END
```

### C. `public/index.html` + `app.js`

```
Page loads
  → if not logged in: show "Login with OAuth2" button
  → button click → window.location = "/login"
After callback
  → display authorization code
  → display access token (if exchanged)
  → display user info (optional)
```

---

## 7. Code Concepts Explained

### Redirect in Express

```javascript
app.get('/login', (req, res) => {
  const authUrl = new URL('http://localhost:8080/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', 'demo-client');
  authUrl.searchParams.set('redirect_uri', 'http://localhost:3000/callback');
  authUrl.searchParams.set('scope', 'openid profile');
  authUrl.searchParams.set('state', 'some-random-state');

  res.redirect(authUrl.toString()); // HTTP 302 → browser goes to OAuth server
});
```

**What happens:** Express sends a `302 Found` response. The browser automatically follows the `Location` header to the OAuth server.

### Reading query parameters

```javascript
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  // code = authorization code from OAuth server
  // state = value you sent in step 1 (verify it matches!)
});
```

### Token exchange with `fetch`

```javascript
const tokenRes = await fetch('http://localhost:8080/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: 'http://localhost:3000/callback',
    client_id: 'demo-client',
  }),
});
const tokens = await tokenRes.json();
// tokens.access_token
```

**Why `URLSearchParams`?** The token endpoint expects form-urlencoded data, not JSON.

### Calling a protected API

```javascript
const userRes = await fetch('http://localhost:8080/userinfo', {
  headers: { Authorization: `Bearer ${tokens.access_token}` },
});
const user = await userRes.json();
```

**Bearer token:** means "whoever holds this token is authorized." You pass it in the `Authorization` header.

---

## 8. One-Day Schedule

### Morning (3–4 hours) — understand + scaffold

| Time      | Task                                                      |
| -----------| -----------------------------------------------------------|
| 0:00–0:45 | Read OAuth flow, draw the sequence diagram on paper       |
| 0:45–1:30 | `npm init`, install deps, create folder structure         |
| 1:30–2:30 | Get `oauth-server.js` running on `:8080`                  |
| 2:30–3:30 | Build login redirect + callback showing `code` in browser |

**Checkpoint:** Click login → return to app → see `code=...` in URL or on page.

### Afternoon (3–4 hours) — complete + polish

| Time      | Task                                                |
| -----------| -----------------------------------------------------|
| 3:30–4:30 | Token exchange in `app-server.js`                   |
| 4:30–5:15 | Optional userinfo display                           |
| 5:15–6:00 | UI polish, error handling (missing code, bad state) |
| 6:00–6:45 | Write README (setup, run, architecture, flow)       |
| 6:45–7:00 | Push to GitHub                                      |

### Evening (1 hour) — practice explaining

Prepare a 3-minute verbal walkthrough:

1. What OAuth2 is
2. Why authorization code flow
3. What each endpoint does
4. What you would do differently in production (HTTPS, secure secrets, PKCE, session cookies)

---

## 9. Dependencies & Setup

### Install

```bash
npm init -y
npm install express
npm install --save-dev oauth2-mock-server
```

### package.json scripts

```json
{
  "type": "module",
  "scripts": {
    "start:oauth": "node src/oauth-server.js",
    "start:app": "node src/app-server.js"
  }
}
```

`"type": "module"` enables `import` syntax in Node.js.

### Run (two terminals)

**Terminal 1 — OAuth mock server:**

```bash
npm run start:oauth
```

**Terminal 2 — Your web app:**

```bash
npm run start:app
```

**Open in browser:** `http://localhost:3000`

---

## 10. Deliverables Checklist

- [ ] Mock OAuth2 server running at `http://localhost:8080`
- [ ] Frontend page with **"Login with OAuth2"** button
- [ ] Redirect to `/authorize`
- [ ] Callback receives `code` and displays it
- [ ] *(Optional but strong)* Exchange code → show `access_token`
- [ ] *(Optional)* Call `/userinfo` and show mock user data
- [ ] README with how to run
- [ ] Push to [GitHub repo](https://github.com/ymaidan/OAuth2-server.git)

### Push to GitHub

```bash
git add .
git commit -m "Add OAuth2 authorization code flow demo"
git push origin main
```

---

## 11. Production vs Demo

Good talking points for the interview:

| Demo (your task) | Production (Floos-scale) |
|---|---|
| `http://localhost` | `https://` only |
| Any `client_id` | Registered client in auth server |
| Token exchange in simple Node app | Secure backend, secrets in vault/env |
| `state` optional in rush | Always validate `state` |
| Mock auto-approves login | Real login UI + MFA |
| Tokens shown on screen | Tokens in httpOnly cookies / server session |

Mentioning this shows maturity beyond "it works on my machine."

---

## 12. Connection to Floos Role

From the Floos Software Engineer job description:

| Job responsibility | How this task relates |
|---|---|
| Support system integration and API connectivity | OAuth is exactly API integration between systems |
| Troubleshoot technical issues | You'll debug redirect URI mismatch, CORS, wrong `grant_type` |
| Maintain technical documentation | Your README matters |
| Familiarity with Git | Pushing this repo completes the optional deliverable |
| Write, test, and debug code | Full-stack Node.js implementation |

---

## 13. Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `redirect_uri mismatch` | Callback URL doesn't match authorize request | Use the exact same URL everywhere |
| Nothing on callback | Wrong port or route | Ensure `/callback` exists in app-server |
| CORS error | Browser calling token endpoint directly | Do token exchange on backend |
| `ECONNREFUSED :8080` | OAuth server not running | Start `oauth-server.js` first |
| Empty `code` | User denied or bad URL | Log full callback URL |
| `invalid_grant` on token exchange | Code already used or expired | Authorization codes are single-use; login again |
| `state` mismatch | CSRF or session issue | Generate `state` per login attempt and verify on callback |

---

## Quick Reference — OAuth Endpoints

| Step | Method | URL | Purpose |
|---|---|---|---|
| 1 | GET | `/authorize` | Start login, get redirect with code |
| 2 | POST | `/token` | Exchange code for access token |
| 3 | GET | `/userinfo` | Get user profile (needs Bearer token) |

---

## Further Reading

- [OAuth 2.0 — oauth.net](https://oauth.net/2/)
- [oauth2-mock-server npm package](https://www.npmjs.com/package/oauth2-mock-server)
- [oauth2-mock-server GitHub](https://github.com/axa-group/oauth2-mock-server)
