import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { webhookRoutes } from './webhook';

describe('Webhook Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/webhook', webhookRoutes);
    
    process.env.LINEAR_WEBHOOK_SECRET = 'test-webhook-secret';
  });

  describe('POST /webhook/linear', () => {
    it('should return error when webhook secret is not configured', async () => {
      delete process.env.LINEAR_WEBHOOK_SECRET;
      
      const res = await app.request('/webhook/linear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          type: 'Issue',
          data: {},
          organizationId: 'test-org',
        }),
      });
      
      const data = await res.json();
      expect(res.status).toBe(500);
      expect(data.error).toBe('Webhook not configured');
    });

    it('should accept valid webhook payload for Issue', async () => {
      const payload = {
        action: 'create',
        type: 'Issue',
        data: {
          id: 'issue-1',
          title: 'Test Issue',
          description: 'Test description',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        organizationId: 'test-org',
        createdAt: '2025-01-01T00:00:00Z',
        url: 'https://linear.app/test',
        webhookId: 'webhook-1',
      };

      const res = await app.request('/webhook/linear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept valid webhook payload for Project', async () => {
      const payload = {
        action: 'create',
        type: 'Project',
        data: {
          id: 'project-1',
          name: 'Test Project',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        organizationId: 'test-org',
        createdAt: '2025-01-01T00:00:00Z',
        url: 'https://linear.app/test',
        webhookId: 'webhook-1',
      };

      const res = await app.request('/webhook/linear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept valid webhook payload for Team', async () => {
      const payload = {
        action: 'create',
        type: 'Team',
        data: {
          id: 'team-1',
          name: 'Test Team',
          key: 'TEST',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        },
        organizationId: 'test-org',
        createdAt: '2025-01-01T00:00:00Z',
        url: 'https://linear.app/test',
        webhookId: 'webhook-1',
      };

      const res = await app.request('/webhook/linear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle unrecognized webhook types gracefully', async () => {
      const payload = {
        action: 'create',
        type: 'UnknownType',
        data: {},
        organizationId: 'test-org',
        createdAt: '2025-01-01T00:00:00Z',
        url: 'https://linear.app/test',
        webhookId: 'webhook-1',
      };

      const res = await app.request('/webhook/linear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
