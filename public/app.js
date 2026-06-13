/**
 * Frontend JavaScript
 * -------------------
 * Most OAuth logic runs on the server (app-server.js) for security.
 * This file adds small UX improvements on the login page.
 *
 * Why server-side OAuth?
 * - Token exchange must not happen in the browser (secrets + CORS)
 * - Authorization code is exchanged on the backend in /callback
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const statusMessage = document.getElementById('status-message');

  if (!loginBtn) {
    return;
  }

  /**
   * When user clicks Login, show a brief "redirecting" message.
   * The actual redirect is handled by the href="/login" link —
   * this is just visual feedback before navigation.
   */
  loginBtn.addEventListener('click', () => {
    if (statusMessage) {
      statusMessage.hidden = false;
      statusMessage.textContent = 'Redirecting to OAuth2 server...';
      statusMessage.className = 'status-message info';
    }

    loginBtn.classList.add('loading');
    loginBtn.textContent = 'Redirecting...';
  });
});
