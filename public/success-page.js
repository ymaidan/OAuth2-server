function toggleSection(contentId) {
  const content = document.getElementById(contentId);
  const btn = document.querySelector(`[data-toggle="${contentId}"]`);
  if (!content) {
    return;
  }

  const willShow = content.hidden;
  content.hidden = !willShow;

  if (btn) {
    btn.textContent = willShow ? 'Hide' : 'Show';
    btn.setAttribute('aria-expanded', String(willShow));
  }

  updateToggleAllButton();
}

function toggleAllTechnicalDetails() {
  const contentIds = ['oauth-code-content', 'oauth-token-content', 'oauth-profile-content'];
  const existing = contentIds.filter((id) => document.getElementById(id));

  if (existing.length === 0) {
    return;
  }

  const anyVisible = existing.some((id) => !document.getElementById(id).hidden);

  existing.forEach((id) => {
    const content = document.getElementById(id);
    const btn = document.querySelector(`[data-toggle="${id}"]`);
    content.hidden = anyVisible;

    if (btn) {
      btn.textContent = anyVisible ? 'Show' : 'Hide';
      btn.setAttribute('aria-expanded', String(!anyVisible));
    }
  });

  updateToggleAllButton();
}

function updateToggleAllButton() {
  const mainBtn = document.getElementById('toggle-all-btn');
  if (!mainBtn) {
    return;
  }

  const contentIds = ['oauth-code-content', 'oauth-token-content', 'oauth-profile-content'];
  const existing = contentIds.filter((id) => document.getElementById(id));
  const anyVisible = existing.some((id) => !document.getElementById(id).hidden);

  mainBtn.textContent = anyVisible ? 'Hide technical details' : 'Show technical details';
}

document.addEventListener('DOMContentLoaded', () => {
  const mainBtn = document.getElementById('toggle-all-btn');
  if (mainBtn) {
    mainBtn.addEventListener('click', toggleAllTechnicalDetails);
  }

  document.querySelectorAll('[data-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleSection(btn.getAttribute('data-toggle'));
    });
  });
});
