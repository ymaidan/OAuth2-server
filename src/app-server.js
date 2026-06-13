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
import {
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
} from './oauth-client.js';
import { StateStore } from './state.js';
import { renderErrorPage, renderSuccessPage } from './templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const stateStore = new StateStore();

setInterval(() => stateStore.cleanup(), 60 * 1000);

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/login', (req, res) => {
  const state = stateStore.create();
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
