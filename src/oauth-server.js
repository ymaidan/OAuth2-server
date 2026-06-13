import { OAuth2Server } from 'oauth2-mock-server';
import { OAUTH_HOST, OAUTH_PORT } from './config.js';

async function startOAuthServer() {
  const server = new OAuth2Server();

  await server.issuer.keys.generate('RS256');

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

  server.service.on('beforeTokenSigning', (token) => {
    token.payload.name = 'Ahmed Demo';
    token.payload.email = 'ahmed.demo@floos.bh';
  });

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
