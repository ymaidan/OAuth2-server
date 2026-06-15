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
import { initDatabase } from './db.js';
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
} from './oauth-client.js';
import { saveLoginSession, cleanupOAuthSessions } from './oauth-sessions.js';
import { StateStore } from './state.js';
import {
  renderErrorPage,
  renderLoginPage,
  renderSuccessPage,
} from './templates.js';
import { authenticateUser, listUsers } from './users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDatabase();

const app = express();
const stateStore = new StateStore();

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

setInterval(() => {
  stateStore.cleanup();
  cleanupOAuthSessions();
}, 60 * 1000);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  const error = req.query.error ? String(req.query.error) : null;
  res.send(renderLoginPage({ error, users: listUsers() }));
});

app.post('/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = authenticateUser(username, password);
  if (!user) {
    return res
      .status(401)
      .send(
        renderLoginPage({
          error: 'Invalid username or password.',
          users: listUsers(),
        })
      );
  }

  const state = stateStore.create();
  saveLoginSession(state, user.id);

  const authUrl = buildAuthorizeUrl({
    oauthBaseUrl: OAUTH_BASE_URL,
    clientId: CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scopes: SCOPES,
    state,
  });

  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.status(400).send(renderErrorPage(error, errorDescription));
  }

  if (!code) {
    return res
      .status(400)
      .send(renderErrorPage('missing_code', 'No authorization code was returned.'));
  }

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

  try {
    const tokens = await exchangeCodeForTokens({
      oauthBaseUrl: OAUTH_BASE_URL,
      code,
      redirectUri: REDIRECT_URI,
      clientId: CLIENT_ID,
    });

    let userInfo = null;
    if (tokens.access_token) {
      userInfo = await fetchUserInfo(OAUTH_BASE_URL, tokens.access_token);
    }

    res.send(renderSuccessPage({ code, tokens, userInfo }));
  } catch (err) {
    res.status(500).send(renderErrorPage('server_error', err.message));
  }
});

app.listen(APP_PORT, APP_HOST);
