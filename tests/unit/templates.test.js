import test from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeHtml,
  renderErrorPage,
  renderSuccessPage,
} from '../../src/templates.js';

test('escapeHtml sanitizes dangerous characters', () => {
  const input = `<script>alert("xss")</script>`;
  const output = escapeHtml(input);

  assert.doesNotMatch(output, /<script>/);
  assert.match(output, /&lt;script&gt;/);
  assert.match(output, /&quot;xss&quot;/);
});

test('renderSuccessPage includes code, token, and user info', () => {
  const html = renderSuccessPage({
    code: 'auth-code-123',
    tokens: { access_token: 'token-abc', token_type: 'Bearer' },
    userInfo: { name: 'Ahmed Demo', email: 'ahmed.demo@floos.bh' },
  });

  assert.match(html, /Login Successful/);
  assert.match(html, /auth-code-123/);
  assert.match(html, /token-abc/);
  assert.match(html, /Ahmed Demo/);
  assert.match(html, /ahmed\.demo@floos\.bh/);
});

test('renderSuccessPage omits user section when userInfo is null', () => {
  const html = renderSuccessPage({
    code: 'auth-code-123',
    tokens: { access_token: 'token-abc', token_type: 'Bearer' },
    userInfo: null,
  });

  assert.doesNotMatch(html, /User Profile/);
});

test('renderErrorPage escapes error content', () => {
  const html = renderErrorPage('<bad>', '<script>alert(1)</script>');

  assert.match(html, /Authentication Failed/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;bad&gt;/);
});
