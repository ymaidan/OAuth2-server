import { OAuth2Server } from 'oauth2-mock-server';
import { OAUTH_HOST, OAUTH_PORT } from './config.js';
import { initDatabase } from './db.js';
import {
  bindAuthCodeToUser,
  cleanupOAuthSessions,
  getUserIdByAuthCode,
} from './oauth-sessions.js';
import { getUserById, toUserInfoClaims } from './users.js';

async function startOAuthServer() {
  initDatabase();

  const server = new OAuth2Server();

  await server.issuer.keys.generate('RS256');

  server.service.on('beforeAuthorizeRedirect', (authorizeRedirectUri, req) => {
    const state = req.query?.state;
    const code = authorizeRedirectUri.url.searchParams.get('code');

    if (state && code) {
      bindAuthCodeToUser(code, state);
    }
  });

  server.service.on('beforeTokenSigning', (token, req) => {
    const code = req.body?.code;
    if (!code) {
      return;
    }

    const userId = getUserIdByAuthCode(code);
    const user = userId ? getUserById(userId) : null;
    if (!user) {
      return;
    }

    const claims = toUserInfoClaims(user);
    token.payload.sub = claims.sub;
    token.payload.name = claims.name;
    token.payload.email = claims.email;
    token.payload.preferred_username = claims.preferred_username;
    token.payload.given_name = claims.given_name;
    token.payload.family_name = claims.family_name;
    token.payload.role = claims.role;
  });

  server.service.on('beforeUserinfo', (userInfoResponse, req) => {
    const authHeader = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return;
    }

    try {
      const payloadPart = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8'));
      const user = payload.sub ? getUserById(payload.sub) : null;

      if (user) {
        userInfoResponse.body = toUserInfoClaims(user);
      }
    } catch {
      // Keep default mock-server response when token cannot be decoded.
    }
  });

  setInterval(() => cleanupOAuthSessions(), 60 * 1000);

  await server.start(OAUTH_PORT, OAUTH_HOST);

  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

startOAuthServer().catch((error) => {
  if (error.code === 'EADDRINUSE') {
    process.exit(1);
  }
  process.exit(1);
});
