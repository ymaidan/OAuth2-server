document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const statusMessage = document.getElementById('status-message');

  if (!loginBtn) {
    return;
  }

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
