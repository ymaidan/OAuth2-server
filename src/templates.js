export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pageShell({ title, eyebrow, heading, subtitle, body, scripts = '' }) {
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
  ${scripts}
</body>
</html>`;
}

function collapsibleSection({ id, title, hint, content, hiddenByDefault = false }) {
  return `<section class="card ${id === 'oauth-code' ? 'success-card' : ''}" id="${id}">
      <div class="section-header">
        <h2>${escapeHtml(title)}</h2>
        <button
          type="button"
          class="btn-toggle"
          data-toggle="${id}-content"
          aria-expanded="${hiddenByDefault ? 'false' : 'true'}"
        >${hiddenByDefault ? 'Show' : 'Hide'}</button>
      </div>
      <div class="section-content" id="${id}-content"${hiddenByDefault ? ' hidden' : ''}>
        <p class="hint">${escapeHtml(hint)}</p>
        ${content}
      </div>
    </section>`;
}

export function renderSuccessPage({ code, tokens, userInfo }) {
  const tokenJson = escapeHtml(JSON.stringify(tokens, null, 2));
  const userJson = userInfo ? escapeHtml(JSON.stringify(userInfo, null, 2)) : null;

  const body = `
    <section class="card toggle-card">
      <p class="hint">Use the buttons below to show or hide OAuth response data.</p>
      <div class="toggle-bar">
        <button type="button" class="btn btn-primary" id="toggle-all-btn">
          Hide technical details
        </button>
      </div>
    </section>

    ${collapsibleSection({
      id: 'oauth-code',
      title: 'Authorization Code',
      hint: 'Single-use code returned by the OAuth server.',
      content: `<pre class="code-block">${escapeHtml(code)}</pre>`,
    })}

    ${collapsibleSection({
      id: 'oauth-token',
      title: 'Access Token',
      hint: 'Token response from POST /token.',
      content: `<pre class="code-block">${tokenJson}</pre>`,
    })}

    ${
      userJson
        ? collapsibleSection({
            id: 'oauth-profile',
            title: 'User Profile',
            hint: 'Profile data from GET /userinfo.',
            content: `<pre class="code-block">${userJson}</pre>`,
          })
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
    scripts: '<script src="/success-page.js"></script>',
  });
}

export function renderLoginPage({ error, users = [] }) {
  const userRows = users
    .map(
      (user) =>
        `<tr>
          <td><code>${escapeHtml(user.username)}</code></td>
          <td>${escapeHtml(user.email)}</td>
          <td>${escapeHtml(user.role)}</td>
        </tr>`
    )
    .join('');

  const body = `
    <section class="card login-card">
      <h2>Sign in</h2>
      <p>Use a demo account from the SQLite database.</p>

      ${
        error
          ? `<p class="status-message info login-error">${escapeHtml(error)}</p>`
          : ''
      }

      <form class="login-form" method="POST" action="/login">
        <label class="field">
          <span>Username or email</span>
          <input type="text" name="username" autocomplete="username" required />
        </label>
        <label class="field">
          <span>Password</span>
          <input type="password" name="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="btn btn-primary">Login with OAuth2</button>
      </form>
    </section>

    <section class="card">
      <h2>Demo users in database</h2>
      <p class="hint">Password for Ahmed and Sara: <code>demo1234</code> · Admin: <code>admin1234</code></p>
      <table class="user-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          ${userRows}
        </tbody>
      </table>
    </section>

    <div class="actions">
      <a href="/" class="btn btn-secondary">Home</a>
    </div>`;

  return pageShell({
    title: 'Sign In — FLOOSS',
    eyebrow: 'OAuth2',
    heading: 'Database Login',
    subtitle: 'Authenticate with a user stored in SQLite',
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
