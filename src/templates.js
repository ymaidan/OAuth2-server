export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSuccessPage({ code, tokens, userInfo }) {
  const tokenJson = escapeHtml(JSON.stringify(tokens, null, 2));
  const userJson = userInfo ? escapeHtml(JSON.stringify(userInfo, null, 2)) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login Successful</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="container">
    <header class="header">
      <p class="eyebrow">OAuth2</p>
      <h1>Login Successful</h1>
      <p class="subtitle">Authorization Code flow completed</p>
    </header>

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
    </div>
  </main>
</body>
</html>`;
}

export function renderErrorPage(error, description) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authentication Failed</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <main class="container">
    <header class="header">
      <p class="eyebrow">OAuth2</p>
      <h1>Authentication Failed</h1>
      <p class="subtitle">The sign-in flow could not be completed</p>
    </header>

    <section class="card error-card">
      <h2>${escapeHtml(error)}</h2>
      <p>${escapeHtml(description || 'Unknown error')}</p>
    </section>

    <div class="actions">
      <a href="/" class="btn btn-secondary">Home</a>
      <a href="/login" class="btn btn-primary">Try again</a>
    </div>
  </main>
</body>
</html>`;
}
