export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pageShell({ title, eyebrow, heading, subtitle, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="container">
    <div class="brand">
      <div class="brand-logo">Flooss</div>
    </div>
    <header class="header">
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h1>${escapeHtml(heading)}</h1>
      <p class="subtitle">${escapeHtml(subtitle)}</p>
    </header>
    ${body}
  </main>
</body>
</html>`;
}

export function renderSuccessPage({ code, tokens, userInfo }) {
  const tokenJson = escapeHtml(JSON.stringify(tokens, null, 2));
  const userJson = userInfo ? escapeHtml(JSON.stringify(userInfo, null, 2)) : null;

  const body = `
    <section class="card success-card">
      <h2>Authorization Code</h2>
      <p class="hint">Single-use code returned by the OAuth server.</p>
      <pre class="code-block">${escapeHtml(code)}</pre>
    </section>

    <section class="card">
      <h2>Access Token</h2>
      <p class="hint">Token response from POST /token.</p>
      <pre class="code-block">${tokenJson}</pre>
    </section>

    ${
      userJson
        ? `<section class="card">
      <h2>User Profile</h2>
      <p class="hint">Profile data from GET /userinfo.</p>
      <pre class="code-block">${userJson}</pre>
    </section>`
        : ''
    }

    <div class="actions">
      <a href="/" class="btn btn-secondary">Home</a>
      <a href="/login" class="btn btn-primary">Sign in again</a>
    </div>`;

  return pageShell({
    title: 'Login Successful — FLOOSS',
    eyebrow: 'OAuth2',
    heading: 'Login Successful',
    subtitle: 'Authorization Code flow completed',
    body,
  });
}

export function renderErrorPage(error, description) {
  const body = `
    <section class="card error-card">
      <h2>${escapeHtml(error)}</h2>
      <p>${escapeHtml(description || 'Unknown error')}</p>
    </section>

    <div class="actions">
      <a href="/" class="btn btn-secondary">Home</a>
      <a href="/login" class="btn btn-primary">Try again</a>
    </div>`;

  return pageShell({
    title: 'Authentication Failed — FLOOSS',
    eyebrow: 'OAuth2',
    heading: 'Authentication Failed',
    subtitle: 'The sign-in flow could not be completed',
    body,
  });
}
