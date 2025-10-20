import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { oauthRoutes } from './oauth';

describe('OAuth Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/oauth', oauthRoutes);
    
    process.env.LINEAR_CLIENT_ID = 'test-client-id';
    process.env.LINEAR_CLIENT_SECRET = 'test-client-secret';
    process.env.LINEAR_REDIRECT_URI = 'http://localhost:3000/oauth/callback';
    process.env.DASHBOARD_URL = 'http://localhost:5173';
  });

  describe('GET /oauth/linear', () => {
    it('should redirect to Linear OAuth page with correct parameters', async () => {
      const res = await app.request('/oauth/linear');
      
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toContain('https://linear.app/oauth/authorize');
      expect(res.headers.get('location')).toContain('client_id=test-client-id');
      expect(res.headers.get('location')).toContain('redirect_uri=');
      expect(res.headers.get('location')).toContain('state=');
    });

    it('should set oauth_state cookie', async () => {
      const res = await app.request('/oauth/linear');
      
      const setCookieHeader = res.headers.get('set-cookie');
      expect(setCookieHeader).toContain('oauth_state=');
      expect(setCookieHeader).toContain('HttpOnly');
    });

    it('should return error when OAuth is not configured', async () => {
      delete process.env.LINEAR_CLIENT_ID;
      
      const res = await app.request('/oauth/linear');
      const data = await res.json();
      
      expect(res.status).toBe(500);
      expect(data.error).toBe('OAuth not configured');
    });
  });

  describe('GET /oauth/callback', () => {
    it('should return error when state parameter is missing', async () => {
      const res = await app.request('/oauth/callback?code=test-code');
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid state parameter');
    });

    it('should return error when authorization code is missing', async () => {
      const res = await app.request('/oauth/callback?state=test-state', {
        headers: {
          Cookie: 'oauth_state=test-state'
        }
      });
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toBe('Missing authorization code');
    });
  });

  describe('GET /oauth/session', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/oauth/session');
      const data = await res.json();
      
      expect(res.status).toBe(401);
      expect(data.authenticated).toBe(false);
    });
  });

  describe('POST /oauth/logout', () => {
    it('should clear authentication cookies', async () => {
      const res = await app.request('/oauth/logout', {
        method: 'POST'
      });
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      
      const setCookieHeaders = res.headers.getSetCookie?.() || [];
      expect(setCookieHeaders.some(h => h.includes('linear_token=') && h.includes('Max-Age=0'))).toBe(true);
    });
  });
});
