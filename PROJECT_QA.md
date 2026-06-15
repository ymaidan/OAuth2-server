# OAuth2 Demo — Simple Q&A

Short questions and answers to help you understand and explain this project.

---

## General

### Q: What is this project?

**A:** A small demo that shows how **OAuth2 login** works. It has a fake login server (mock OAuth provider) and a simple web app with a **"Login with OAuth2"** button. When you click it, you go through the real Authorization Code flow and see the code, access token, and user profile at the end.

---

### Q: Why are there two servers?

**A:** In real life, login is always handled by a **separate** service (Google, Microsoft, Auth0, etc.). This project copies that:

| Server | Port | Role |
|--------|------|------|
| OAuth mock server | `8080` | Pretends to be the identity provider |
| Web app | `3000` | Your application with the login button |

Two servers make the flow easier to understand and closer to production.

---

### Q: Do I need a real user database or Google account?

**A:** No. The mock server on port `8080` fakes everything. User data (name, email) is **hardcoded** on purpose — that is normal for a learning/demo project.

---

### Q: What do I need to run it?

**A:**

1. Node.js installed
2. Run `npm install` once
3. Start both servers in two terminals:

```bash
npm run start:oauth   # Terminal 1 — port 8080
npm run start:app     # Terminal 2 — port 3000
```

4. Open `http://localhost:3000` in your browser

---

## OAuth Flow

### Q: What happens when I click "Login with OAuth2"?

**A:** Step by step:

1. Browser goes to `/login` on your app (`:3000`)
2. App redirects you to the mock OAuth server `/authorize` (`:8080`)
3. Mock server approves login and redirects back to `/callback?code=...&state=...`
4. App exchanges the `code` for an `access_token` (server-side)
5. App calls `/userinfo` with the token
6. You see a success page with the code, token, and user profile

---

### Q: What is an authorization code?

**A:** A short, **one-time** string the OAuth server puts in the callback URL. Your app sends it to the token endpoint and gets back an **access token**. The code is not the final credential — it is exchanged for the token.

---

### Q: What is an access token?

**A:** A credential that proves the user logged in. Your app sends it in the header:

```http
Authorization: Bearer <access_token>
```

to call protected endpoints like `/userinfo`. In a real app, you would use it to call your own APIs too.

---

### Q: What is `state` and why do we use it?

**A:** `state` is a random value your app creates before redirecting to login. When the user comes back, the app checks that the `state` in the URL matches what it saved. This helps prevent **CSRF attacks** — someone tricking you into using a callback URL they crafted.

---

### Q: What are scopes (`openid profile email`)?

**A:** Scopes are **permissions** your app asks for:

- `openid` — identity (OpenID Connect)
- `profile` — name, username, etc.
- `email` — email address

The mock server returns mock profile data for these scopes.

---

### Q: Why does token exchange happen on the server, not in the browser?

**A:** Safer and more realistic. In production, the client secret (if any) and token handling stay on the backend. The browser only follows redirects; it does not need to see raw tokens in JavaScript for this demo (though the success page does display them for learning).

---

## Files & Code

### Q: What does each main file do?

**A:**

| File | Purpose |
|------|---------|
| `src/config.js` | URLs, ports, client ID, redirect URI, scopes |
| `src/oauth-server.js` | Starts mock OAuth server on port 8080 |
| `src/app-server.js` | Express app — routes `/`, `/login`, `/callback` |
| `src/oauth-client.js` | Builds authorize URL, exchanges code, fetches userinfo |
| `src/state.js` | Creates and validates OAuth `state` |
| `src/templates.js` | HTML for success and error pages |
| `public/index.html` | Login page with the button |
| `public/app.js` | Shows "Redirecting..." when you click login |
| `public/style.css` | UI styling |

---

### Q: Why is user data hardcoded in `oauth-server.js`?

**A:** Because this is a **mock** identity provider. There is no real user database. The `beforeUserinfo` hook fills in fake claims (name, email, etc.) so `/userinfo` returns something realistic. That is the correct approach for this task.

---

### Q: What is `beforeUserinfo` and `beforeTokenSigning`?

**A:** Hooks from `oauth2-mock-server` that run before the server responds:

- **`beforeUserinfo`** — Sets the JSON body for `GET /userinfo`
- **`beforeTokenSigning`** — Adds `name` and `email` inside the JWT access token

Both are optional customization; only `beforeUserinfo` is needed for the user profile step.

---

### Q: What is the list of 5 steps on the home page for?

**A:** Documentation only. It explains the flow before you log in. It is **not** required by the task — it just helps reviewers and you understand what will happen.

---

### Q: What do I see on the success page after login?

**A:** Three blocks (if everything works):

1. **Authorization Code** — the `code` from the callback URL
2. **Access Token** — JSON response from `POST /token`
3. **User Profile** — JSON from `GET /userinfo` (optional task requirement — you implemented it)

For the assessment, showing this data **proves** the full flow worked. You do not need to build more features on top of it.

---

## Task Requirements

### Q: Does my project meet the assignment requirements?

**A:** Yes. You have:

- Mock OAuth2 server (`oauth2-mock-server`) on `localhost:8080`
- Authorization Code flow
- Frontend with "Login with OAuth2" button
- Redirect to authorize → callback with `code`
- Token display on success page
- Optional: userinfo fetch and display

---

### Q: What is required vs optional?

**A:**

| Item | Required? |
|------|-----------|
| Mock OAuth server | Yes |
| Authorization Code flow | Yes |
| Login button | Yes |
| Redirect with `code` in URL | Yes |
| Token display | Yes |
| Fetch `/userinfo` and show profile | Optional |
| Flow steps on home page | Not required (nice extra) |
| Tests, styling, CSRF `state` | Not required (extras you added) |

---

### Q: Do I need to add more features before submitting?

**A:** No. Login works, tokens are shown, and the optional userinfo step is done. You can submit as-is.

---

## Testing

### Q: How do I run tests?

**A:**

```bash
npm test                  # Unit tests — no servers needed
npm run test:integration  # Needs both servers running
```

---

### Q: Why do integration tests skip sometimes?

**A:** Integration tests need both servers on ports `3000` and `8080`. If they are not running, tests call `t.skip()` instead of failing. Start `start:oauth` and `start:app` first, then run `npm run test:integration`.

---

## Troubleshooting

### Q: The OAuth server won't start — what should I check?

**A:** Port `8080` might already be in use. Stop any other process using it, or close a previous `start:oauth` terminal. The code exits silently on `EADDRINUSE`.

---

### Q: Login fails or callback shows an error — what went wrong?

**A:** Common causes:

1. **Only one server running** — you need both `:8080` and `:3000`
2. **`invalid_state`** — session expired or you opened `/callback` directly; click login again
3. **`missing_code`** — you visited `/callback` without going through login first

---

### Q: I see "Redirecting..." but nothing happens

**A:** Make sure the app server (`npm run start:app`) is running on port `3000`. The button links to `/login` on that server.

---

## Real World vs This Demo

### Q: How is this different from a production app?

**A:**

| This demo | Production |
|-----------|------------|
| Mock server on localhost | Real provider (Google, Auth0, etc.) |
| Hardcoded user | Real user database |
| Tokens shown on HTML page | Tokens stored securely (httpOnly cookies, server session) |
| HTTP | HTTPS required |
| No client secret | Often uses client secret on backend |

---

### Q: In a real app, what would I do after login?

**A:** Typically:

1. Store the session server-side (not show the raw token to the user)
2. Show "Welcome, Ahmed" using profile data
3. Use the access token to call your APIs
4. Redirect to a dashboard — not a debug page with JSON

This project **shows** the token on purpose so you can learn the flow.

---

## Quick Interview Answers

### Q: Explain OAuth2 Authorization Code flow in one sentence.

**A:** The user is redirected to an identity provider to approve access; the provider sends back a one-time code; the app exchanges that code for an access token on the server, then uses the token to access protected resources like user profile.

---

### Q: Why use Authorization Code flow instead of putting the token in the URL?

**A:** The code is short-lived and exchanged server-side, so the access token never appears in the browser URL or history — it is more secure than implicit flows for web apps.

---

### Q: What is the role of `redirect_uri`?

**A:** It tells the OAuth server exactly where to send the user after login. It must match what is registered for the client, or the server rejects the request — this stops tokens being sent to the wrong app.

---

*For line-by-line code details, see [CODE_EXPLANATION.md](./CODE_EXPLANATION.md). For setup and architecture, see [README.md](./README.md).*
