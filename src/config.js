export const OAUTH_HOST = 'localhost';
export const OAUTH_PORT = 8080;
export const OAUTH_BASE_URL = `http://${OAUTH_HOST}:${OAUTH_PORT}`;

export const APP_HOST = 'localhost';
export const APP_PORT = 3000;
export const APP_BASE_URL = `http://${APP_HOST}:${APP_PORT}`;

export const CLIENT_ID = 'floos-demo-client';
export const REDIRECT_URI = `${APP_BASE_URL}/callback`;
export const SCOPES = 'openid profile email';
