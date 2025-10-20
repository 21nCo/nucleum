import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { apiRoutes } from './api';

describe('API Routes', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api', apiRoutes);
  });

  describe('Authentication Middleware', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await app.request('/api/time-entries');
      const data = await res.json();
      
      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when token is missing', async () => {
      const res = await app.request('/api/time-entries', {
        headers: {
          Cookie: 'workspace_id=test-workspace'
        }
      });
      const data = await res.json();
      
      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when workspace_id is missing', async () => {
      const res = await app.request('/api/time-entries', {
        headers: {
          Cookie: 'linear_token=test-token'
        }
      });
      const data = await res.json();
      
      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('GET /api/time-entries', () => {
    it('should accept valid authentication', async () => {
      const res = await app.request('/api/time-entries', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      
      expect(res.status).toBe(200);
    });

    it('should accept query parameters', async () => {
      const res = await app.request('/api/time-entries?issueId=issue-1&userId=user-1', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/time-entries', () => {
    it('should return 400 when required fields are missing', async () => {
      const res = await app.request('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        },
        body: JSON.stringify({
          description: 'Test entry'
        })
      });
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toBe('Missing required fields');
    });

    it('should accept valid time entry creation', async () => {
      const res = await app.request('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        },
        body: JSON.stringify({
          issueId: 'issue-1',
          userId: 'user-1',
          startTime: '2025-01-01T00:00:00Z',
          endTime: '2025-01-01T01:00:00Z',
          description: 'Worked on feature'
        })
      });
      
      expect(res.status).toBe(201);
    });
  });

  describe('PATCH /api/time-entries/:id', () => {
    it('should accept update request', async () => {
      const res = await app.request('/api/time-entries/entry-1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        },
        body: JSON.stringify({
          endTime: '2025-01-01T02:00:00Z'
        })
      });
      
      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/time-entries/:id', () => {
    it('should accept delete request', async () => {
      const res = await app.request('/api/time-entries/entry-1', {
        method: 'DELETE',
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/analytics', () => {
    it('should return 400 when required query parameters are missing', async () => {
      const res = await app.request('/api/analytics', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toBe('Missing required query parameters');
    });

    it('should accept valid analytics request', async () => {
      const res = await app.request('/api/analytics?groupBy=issue&startDate=2025-01-01&endDate=2025-01-31', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/linear/:type', () => {
    it('should return 400 for invalid type', async () => {
      const res = await app.request('/api/linear/invalid', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid type');
    });

    it('should accept valid type - teams', async () => {
      const res = await app.request('/api/linear/teams', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      
      expect(res.status).toBe(200);
    });

    it('should accept valid type - projects', async () => {
      const res = await app.request('/api/linear/projects', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      
      expect(res.status).toBe(200);
    });

    it('should accept valid type - issues', async () => {
      const res = await app.request('/api/linear/issues', {
        headers: {
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        }
      });
      
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/timer/start', () => {
    it('should return 400 when issueId is missing', async () => {
      const res = await app.request('/api/timer/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: 'linear_token=test-token; workspace_id=test-workspace'
        },
        body: JSON.stringify({
          description: 'Working on task'
        })
      });
      const data = await res.json();
      
      expect(res.status).toBe(400);
      expect(data.error).toBe('Issue ID is required');
    });
  });
});
