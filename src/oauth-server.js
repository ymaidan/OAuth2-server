/**
 * OAuth2 Mock Server
 * ------------------
 * This file starts a fake Identity Provider (IdP) on http://localhost:8080.
 *
 * In a real app, this role is played by Google, Microsoft, or a company's
 * own auth server. We use oauth2-mock-server so we can develop locally
 * without registering a real OAuth app.
 *
 * Endpoints provided automatically:
 *   GET  /authorize  → simulates user login, redirects with ?code=...
 *   POST /token      → exchanges authorization code for access_token
 *   GET  /userinfo   → returns user profile when given a valid token
 *
 * Run: npm run start:oauth
 */

import { OAuth2Server } from 'oauth2-mock-server';
import { OAUTH_HOST, OAUTH_PORT } from './config.js';

async function startOAuthServer() {
  // Create a new mock OAuth2 / OpenID Connect server instance
  const server = new OAuth2Server();

  /**
   * Generate RSA signing keys for JWT access tokens.
   * RS256 = RSA signature with SHA-256 (standard for OAuth2/OIDC).
   * Real providers publish their public keys at /jwks for token verification.
   */
  await server.issuer.keys.generate('RS256');

  /**
   * Customize the /userinfo response with mock Floos user data.
   * The 'beforeUserinfo' event fires on every userinfo request.
   * We override the default body with realistic demo claims.
   */
  server.service.on('beforeUserinfo', (userInfoResponse) => {
    userInfoResponse.body = {
      sub: 'floos-user-001',
      name: 'Ahmed Demo',
      email: 'ahmed.demo@floos.bh',
      preferred_username: 'ahmed_demo',
      given_name: 'Ahmed',
      family_name: 'Demo',
    };
  });

  /**
   * Customize JWT token payload when tokens are signed.
   * Adds extra claims that will appear inside the access token.
   */
  server.service.on('beforeTokenSigning', (token) => {
    token.payload.name = 'Ahmed Demo';
    token.payload.email = 'ahmed.demo@floos.bh';
  });

  // Start listening — same as: http://localhost:8080
  await server.start(OAUTH_PORT, OAUTH_HOST);

  console.log('========================================');
  console.log('  OAuth2 Mock Server is running');
  console.log(`  Issuer URL: ${server.issuer.url}`);
  console.log('========================================');
  console.log('  Endpoints:');
  console.log(`    Authorize: ${server.issuer.url}/authorize`);
  console.log(`    Token:     ${server.issuer.url}/token`);
  console.log(`    Userinfo:  ${server.issuer.url}/userinfo`);
  console.log('========================================');
  console.log('Press Ctrl+C to stop.\n');

  // Graceful shutdown when you press Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\nStopping OAuth2 mock server...');
    await server.stop();
    process.exit(0);
  });
}

startOAuthServer().catch((error) => {
  console.error('Failed to start OAuth2 mock server:', error);
  process.exit(1);
});
