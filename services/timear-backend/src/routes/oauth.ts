import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';

const oauth = new Hono();

/**
 * Linear OAuth Configuration
 * 
 * Required environment variables:
 * - LINEAR_CLIENT_ID: Linear OAuth client ID
 * - LINEAR_CLIENT_SECRET: Linear OAuth client secret
 * - LINEAR_REDIRECT_URI: OAuth redirect URI
 */

interface LinearTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface LinearUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

/**
 * Initiate OAuth flow with Linear
 * GET /oauth/linear
 */
oauth.get('/linear', (c) => {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const redirectUri = process.env.LINEAR_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return c.json({ error: 'OAuth not configured' }, 500);
  }

  const state = crypto.randomUUID();
  setCookie(c, 'oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 600, // 10 minutes
  });

  const scopes = [
    'read',
    'write',
    'issues:create',
    'timeSchedule:write',
  ].join(',');

  const authUrl = new URL('https://linear.app/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);

  return c.redirect(authUrl.toString());
});

/**
 * OAuth callback handler
 * GET /oauth/callback
 */
oauth.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const storedState = getCookie(c, 'oauth_state');

  if (!state || state !== storedState) {
    return c.json({ error: 'Invalid state parameter' }, 400);
  }

  if (!code) {
    return c.json({ error: 'Missing authorization code' }, 400);
  }

  try {
    const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINEAR_CLIENT_ID!,
        client_secret: process.env.LINEAR_CLIENT_SECRET!,
        redirect_uri: process.env.LINEAR_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code');
    }

    const tokenData: LinearTokenResponse = await tokenResponse.json();

    const userResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        query: `
          query {
            viewer {
              id
              name
              email
              avatarUrl
              organization {
                id
                name
              }
            }
          }
        `,
      }),
    });

    const userData = await userResponse.json();
    const viewer = userData.data?.viewer;

    if (!viewer) {
      throw new Error('Failed to fetch user data');
    }

    const workspaceId = viewer.organization.id;
    
    setCookie(c, 'linear_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: tokenData.expires_in,
    });

    setCookie(c, 'workspace_id', workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: tokenData.expires_in,
    });

    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:5173';
    return c.redirect(`${dashboardUrl}/auth/success`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
});

/**
 * Get current user session
 * GET /oauth/session
 */
oauth.get('/session', async (c) => {
  const token = getCookie(c, 'linear_token');
  const workspaceId = getCookie(c, 'workspace_id');

  if (!token || !workspaceId) {
    return c.json({ authenticated: false }, 401);
  }

  try {
    const userResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query {
            viewer {
              id
              name
              email
              avatarUrl
            }
          }
        `,
      }),
    });

    const userData = await userResponse.json();
    const viewer = userData.data?.viewer;

    if (!viewer) {
      return c.json({ authenticated: false }, 401);
    }

    return c.json({
      authenticated: true,
      user: viewer,
      workspaceId,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return c.json({ authenticated: false }, 401);
  }
});

/**
 * Logout
 * POST /oauth/logout
 */
oauth.post('/logout', (c) => {
  setCookie(c, 'linear_token', '', { maxAge: 0 });
  setCookie(c, 'workspace_id', '', { maxAge: 0 });
  setCookie(c, 'oauth_state', '', { maxAge: 0 });

  return c.json({ success: true });
});

export { oauth as oauthRoutes };
