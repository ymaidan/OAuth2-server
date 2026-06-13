/**
 * Shared configuration for both servers.
 *
 * Keeping URLs and client settings in one file avoids typos in redirect_uri,
 * which is the most common OAuth2 integration bug.
 */

/** Mock OAuth2 provider — simulates Google, Floos IDP, etc. */
export const OAUTH_HOST = 'localhost';
export const OAUTH_PORT = 8080;
export const OAUTH_BASE_URL = `http://${OAUTH_HOST}:${OAUTH_PORT}`;

/** Your web application server */
export const APP_HOST = 'localhost';
export const APP_PORT = 3000;
export const APP_BASE_URL = `http://${APP_HOST}:${APP_PORT}`;

/**
 * OAuth2 client identifier.
 * In production this is registered with the identity provider.
 * The mock server accepts any client_id for testing.
 */
export const CLIENT_ID = 'floos-demo-client';

/**
 * Where the OAuth server sends the user back after "login".
 * MUST match exactly in /authorize and /token requests.
 */
export const REDIRECT_URI = `${APP_BASE_URL}/callback`;

/** Permissions we request from the OAuth server */
export const SCOPES = 'openid profile email';
