# OAuth2-server

A demo web application that implements the **OAuth2 Authorization Code flow** using the [oauth2-mock-server](https://www.npmjs.com/package/oauth2-mock-server) npm package.

Built as a coding assessment for **Floos** — demonstrates API integration, OAuth2 concepts, and full-stack Node.js development.

## What this project does

1. Runs a **mock OAuth2 server** on `http://localhost:8080` (simulates an identity provider)
2. Runs a **web application** on `http://localhost:3000` with a "Login with OAuth2" button
3. Redirects the user through the standard Authorization Code flow
4. Exchanges the authorization code for an access token
5. Fetches mock user info from the `/userinfo` endpoint

## Project structure

```
OAuth2/
├── package.json              # Dependencies and npm scripts
├── README.md                 # This file
├── OAUTH2-ASSESSMENT-GUIDE.md # Detailed study guide
├── src/
│   ├── config.js             # Shared URLs and OAuth client settings
│   ├── oauth-server.js       # Mock OAuth2 server (port 8080)
│   └── app-server.js         # Web app + OAuth client logic (port 3000)
└── public/
    ├── index.html            # Login page with OAuth button
    ├── app.js                # Frontend UX enhancements
    └── style.css             # Shared styles
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or later
- npm (comes with Node.js)

## Installation

```bash
npm install
```

## How to run

You need **two terminal windows** — one for each server.

**Terminal 1 — Start the OAuth2 mock server:**

```bash
npm run start:oauth
```

**Terminal 2 — Start the web application:**

```bash
npm run start:app
```

**Open in browser:** [http://localhost:3000](http://localhost:3000)

Click **"Login with OAuth2"** and follow the flow.

## OAuth2 flow (summary)

```
User → /login → OAuth /authorize → /callback?code=...
     → POST /token → access_token → GET /userinfo → display results
```

See [OAUTH2-ASSESSMENT-GUIDE.md](./OAUTH2-ASSESSMENT-GUIDE.md) for a full explanation of every step.

## Technologies used

- **Node.js** — runtime
- **Express** — web application server
- **oauth2-mock-server** — mock OAuth2 / OpenID Connect provider
- **Vanilla HTML/CSS/JS** — minimal frontend

## Author

Assessment project for Floos Software Engineer role.
