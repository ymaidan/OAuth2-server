# OAuth2 Authorization Code Flow

A production-style OAuth2 demo built with Node.js and Express for the **Flooss** technical assessment. The project implements the **Authorization Code flow** using a local mock identity provider, with a Flooss-branded frontend, server-side token exchange, and automated test coverage.

## Highlights

- OAuth2 mock server powered by [`oauth2-mock-server`](https://www.npmjs.com/package/oauth2-mock-server)
- Express web client with secure backend token exchange
- CSRF protection via OAuth `state` validation
- User profile retrieval from `/userinfo`
- Unit and integration tests using Node.js built-in test runner
- Polished responsive UI

## Architecture

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

## Project Structure

```text
OAuth2/
├── src/
│   ├── app-server.js       # Express app and OAuth routes
│   ├── oauth-server.js     # Mock OAuth2 provider
│   ├── oauth-client.js     # Authorize URL, token, and userinfo helpers
│   ├── state.js            # OAuth state store (CSRF protection)
│   ├── templates.js        # HTML render helpers
│   └── config.js           # Shared OAuth configuration
├── public/
│   ├── index.html          # Login page
│   ├── app.js              # Frontend interactions
│   └── style.css           # UI styling
├── tests/
│   ├── unit/               # Fast unit tests (no servers required)
│   └── integration/        # End-to-end flow tests
├── package.json
└── README.md
```

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- npm

## Getting Started

Install dependencies:

```bash
npm install
```

Start both services in separate terminals:

```bash
# Terminal 1
npm run start:oauth

# Terminal 2
npm run start:app
```

Open the application:

```text
http://localhost:3000
```

Click **Login with OAuth2** to complete the flow.

## OAuth Flow

| Step | Endpoint | Description |
|------|----------|-------------|
| 1 | `GET /login` | Builds authorize URL and redirects the browser |
| 2 | `GET /authorize` | Mock server issues an authorization code |
| 3 | `GET /callback` | App receives `code` and validates `state` |
| 4 | `POST /token` | App exchanges code for `access_token` |
| 5 | `GET /userinfo` | App fetches authenticated user profile |

## Testing

### Unit tests

Runs instantly without starting any servers:

```bash
npm test
```

Unit test files:

- `tests/unit/config.test.js`
- `tests/unit/state.test.js`
- `tests/unit/oauth-client.test.js`
- `tests/unit/templates.test.js`

### Integration tests

Requires both servers to be running:

```bash
npm run test:integration
```

Integration test file:

- `tests/integration/oauth-flow.test.js`

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET | Login page |
| `/login` | GET | Starts OAuth authorization |
| `/callback` | GET | Handles OAuth redirect and token exchange |

## Configuration

All OAuth settings are centralized in `src/config.js`:

| Variable | Value |
|----------|-------|
| OAuth server | `http://localhost:8080` |
| Web app | `http://localhost:3000` |
| Client ID | `floos-demo-client` |
| Redirect URI | `http://localhost:3000/callback` |
| Scopes | `openid profile email` |

## Tech Stack

- Node.js (ES Modules)
- Express
- oauth2-mock-server
- Vanilla HTML / CSS / JavaScript
- Node.js test runner (`node:test`)

## Security Notes

This repository is intentionally built for local demonstration. In production:

- Enforce HTTPS
- Store secrets securely
- Use httpOnly cookies for session handling
- Validate OAuth state on every callback
- Avoid exposing tokens in the browser

## Author

Yousif Yasser Maidan
