export function buildAuthorizeUrl({
  oauthBaseUrl,
  clientId,
  redirectUri,
  scopes,
  state,
}) {
  const authUrl = new URL(`${oauthBaseUrl}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

export async function exchangeCodeForTokens({
  oauthBaseUrl,
  code,
  redirectUri,
  clientId,
}) {
  const response = await fetch(`${oauthBaseUrl}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Token exchange failed');
  }

  return data;
}

export async function fetchUserInfo(oauthBaseUrl, accessToken) {
  const response = await fetch(`${oauthBaseUrl}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Userinfo request failed');
  }

  return data;
}
