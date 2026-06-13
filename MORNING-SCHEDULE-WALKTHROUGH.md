# Morning Schedule Walkthrough — What, Where, and Why

This maps each step from the assessment guide (Section 8, morning block) to what was actually built in this project.

---

## Step 1: `0:00–0:45` — Read OAuth flow, draw the sequence diagram

### What we did

Before writing code, we defined the **Authorization Code flow** — the pattern the assessment requires.

### The flow we designed

```
YOU (browser)          YOUR APP (:3000)           OAUTH SERVER (:8080)
     |                        |                            |
     |-- click Login -------->|                            |
     |                        |-- redirect to /authorize ->|
     |                        |                            |-- auto-approve
     |<----------------------- redirect /callback?code=... |
     |                        |                            |
     |                        |-- POST /token (exchange) ->|
     |                        |<-- access_token -----------|
```

### Why this matters

OAuth is not "login inside your app." Your app **redirects** the user to a trusted server, gets a **code**, then exchanges it for a **token**. Understanding this first prevents building the wrong thing.

### Where it lives

- Conceptual explanation: `OAUTH2-ASSESSMENT-GUIDE.md` (sections 2–3)
- Visual flow on the login page: `public/index.html` lines 41–49

---

## Step 2: `0:45–1:30` — `npm init`, install deps, create folder structure

### What we did

**1. Created `package.json`**

```json
{
  "name": "oauth2-server-demo",
  "type": "module",
  "scripts": {
    "start:oauth": "node src/oauth-server.js",
    "start:app": "node src/app-server.js"
  },
  "dependencies": {
    "express": "^5.1.0"
  },
  "devDependencies": {
    "oauth2-mock-server": "^8.2.3"
  }
}
```

| Setting | Why |
|---|---|
| `"type": "module"` | Enables `import` instead of `require` |
| `express` | Serves your web app and handles `/login`, `/callback` |
| `oauth2-mock-server` | Fake Google/Floos auth server (task requirement) |
| `start:oauth` / `start:app` | Two servers must run separately |

**2. Created folder structure**

```
OAuth2/
├── src/           ← backend logic
├── public/        ← frontend (HTML/CSS/JS)
├── package.json
└── .gitignore
```

**Why split `src/` and `public/`?**

- `src/` = server-side Node code (secrets, token exchange)
- `public/` = files the browser downloads (HTML, CSS)

**3. Created `src/config.js`**

```javascript
export const OAUTH_HOST = 'localhost';
export const OAUTH_PORT = 8080;
export const OAUTH_BASE_URL = `http://${OAUTH_HOST}:${OAUTH_PORT}`;

export const APP_HOST = 'localhost';
export const APP_PORT = 3000;
export const APP_BASE_URL = `http://${APP_HOST}:${APP_PORT}`;

export const CLIENT_ID = 'floos-demo-client';
export const REDIRECT_URI = `${APP_BASE_URL}/callback`;
export const SCOPES = 'openid profile email';
```

**Why a separate config file?**

`redirect_uri` must be **identical** in `/authorize` and `/token`. One typo breaks the whole flow. Central config avoids that.

---

## Step 3: `1:30–2:30` — Get `oauth-server.js` running on `:8080`

### What we did

Built `src/oauth-server.js` — the fake identity provider.

### Key code

```javascript
async function startOAuthServer() {
  const server = new OAuth2Server();
  await server.issuer.keys.generate('RS256');
  // ... customize userinfo ...
  await server.start(OAUTH_PORT, OAUTH_HOST);
}
```

| Line | What | Why |
|---|---|---|
| `new OAuth2Server()` | Create mock auth server | Required by the npm package |
| `keys.generate('RS256')` | Generate RSA signing keys | Access tokens are JWTs; they need to be signed |
| `server.start(8080, 'localhost')` | Listen on port 8080 | Task says `http://localhost:8080` |

### What this server provides automatically

| Endpoint | What it does |
|---|---|
| `GET /authorize` | Simulates login → redirects with `?code=...` |
| `POST /token` | Exchanges code for `access_token` |
| `GET /userinfo` | Returns user profile |

### How to run

```bash
npm run start:oauth
```

You should see:

```
OAuth2 Mock Server is running
Issuer URL: http://localhost:8080
```

### Why port 8080?

The task explicitly says start the OAuth server on `http://localhost:8080`. Your app runs on `3000` so they don't conflict.

---

## Step 4: `2:30–3:30` — Build login redirect + callback showing `code`

This is the core of the assessment. Three pieces work together.

---

### Part A: Login button — `public/index.html`

```html
<a href="/login" class="btn btn-primary" id="login-btn">Login with OAuth2</a>
```

**What happens:** Click → browser goes to `http://localhost:3000/login`

**Why not link directly to `localhost:8080/authorize`?**

The authorize URL needs `client_id`, `redirect_uri`, `scope`, and `state`. The **server builds that URL** so the frontend stays simple and `state` is generated securely.

---

### Part B: Login redirect — `src/app-server.js` → `GET /login`

```javascript
app.get('/login', (req, res) => {
  const state = createState();

  const authUrl = new URL(`${OAUTH_BASE_URL}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('scope', SCOPES);
  authUrl.searchParams.set('state', state);

  res.redirect(authUrl.toString());
});
```

**What happens step by step:**

1. `createState()` — random string stored in memory (CSRF protection)
2. Build URL like:
   ```
   http://localhost:8080/authorize?
     response_type=code
     &client_id=floos-demo-client
     &redirect_uri=http://localhost:3000/callback
     &scope=openid profile email
     &state=abc123...
   ```
3. `res.redirect()` — HTTP 302; browser navigates to OAuth server

| Parameter | Meaning |
|---|---|
| `response_type=code` | "Give me an authorization code" |
| `client_id` | Who is asking to log in |
| `redirect_uri` | Where to send the user back |
| `state` | Random value to verify the callback is legitimate |

---

### Part C: Callback — `src/app-server.js` → `GET /callback`

```javascript
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (!code) { /* error */ }
  if (!consumeState(state)) { /* error - CSRF check */ }

  const tokens = await exchangeCodeForTokens(code);
  let userInfo = await fetchUserInfo(tokens.access_token);

  res.send(renderSuccessPage({ code, tokens, userInfo }));
});
```

**What happens when OAuth redirects back:**

1. Browser lands on:
   ```
   http://localhost:3000/callback?code=0e02e2c3-...&state=abc123
   ```
2. `req.query.code` — read the authorization code from the URL
3. `consumeState(state)` — verify `state` matches what we sent (security)
4. `exchangeCodeForTokens(code)` — backend POST to `/token`
5. `renderSuccessPage()` — show code on the page

**Checkpoint from the guide:**

> Click login → return to app → see `code=...` in URL or on page

You pass this when you see **Step 1 — Authorization Code** on the success page.

---

## Full journey in one picture

```
1. http://localhost:3000
   └── index.html — "Login with OAuth2" button

2. Click → http://localhost:3000/login
   └── app-server.js builds authorize URL, redirects browser

3. Browser → http://localhost:8080/authorize?...
   └── oauth-server.js auto-approves, redirects back

4. Browser → http://localhost:3000/callback?code=XXX&state=YYY
   └── app-server.js reads code, exchanges token, shows results

5. You see "Login Successful" page with code + token + user info
```

---

## Why two servers?

| Server | File | Port | Role |
|---|---|---|---|
| OAuth (fake IdP) | `oauth-server.js` | 8080 | Pretends to be Google/Floos login |
| Your app | `app-server.js` | 3000 | Your actual website |

In production these are completely separate systems. This setup mirrors that.

---

## File map — quick reference

| File | Purpose |
|---|---|
| `package.json` | Dependencies and npm scripts |
| `src/config.js` | Shared URLs, client ID, redirect URI |
| `src/oauth-server.js` | Mock OAuth2 provider on port 8080 |
| `src/app-server.js` | Web app: `/login`, `/callback`, token exchange |
| `public/index.html` | Login page with OAuth button |
| `public/app.js` | Frontend UX (redirecting message) |
| `public/style.css` | Shared styling |

---

## What you already completed beyond the morning checkpoint

The morning goal was only to see the `code`. This project also does the **afternoon tasks**:

- Token exchange (`exchangeCodeForTokens` in `app-server.js`)
- Userinfo fetch (`fetchUserInfo` in `app-server.js`)
- Success page with all three steps (`renderSuccessPage` in `app-server.js`)

That is why the success page shows Step 1 (code), Step 2 (token), and Step 3 (user info).

---

## Related docs

- [OAUTH2-ASSESSMENT-GUIDE.md](./OAUTH2-ASSESSMENT-GUIDE.md) — full study guide
- [README.md](./README.md) — how to install and run
