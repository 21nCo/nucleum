import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { DatabaseProviderFactory } from '../providers/database-factory';

const api = new Hono();

/**
 * Middleware to verify authentication
 */
api.use('/*', async (c, next) => {
  const token = getCookie(c, 'linear_token');
  const workspaceId = getCookie(c, 'workspace_id');

  if (!token || !workspaceId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('token', token);
  c.set('workspaceId', workspaceId);

  await next();
});

/**
 * Get time tracking entries
 * GET /api/time-entries
 * 
 * Query params:
 * - issueId: Filter by issue
 * - userId: Filter by user
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 */
api.get('/time-entries', async (c) => {
  const workspaceId = c.get('workspaceId');
  const { issueId, userId, startDate, endDate } = c.req.query();

  try {
    const db = DatabaseProviderFactory.getProvider(workspaceId);
    const entries = await db.getTimeEntries({
      issueId,
      userId,
      startDate,
      endDate,
    });

    return c.json({ entries });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    return c.json({ error: 'Failed to fetch time entries' }, 500);
  }
});

/**
 * Create time tracking entry
 * POST /api/time-entries
 * 
 * Body:
 * - issueId: Linear issue ID
 * - userId: User ID
 * - startTime: ISO timestamp
 * - endTime: ISO timestamp (optional, for completed entries)
 * - description: Optional description
 */
api.post('/time-entries', async (c) => {
  const workspaceId = c.get('workspaceId');
  const body = await c.req.json();

  const { issueId, userId, startTime, endTime, description } = body;

  if (!issueId || !userId || !startTime) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  try {
    const db = DatabaseProviderFactory.getProvider(workspaceId);
    const entry = await db.createTimeEntry({
      id: crypto.randomUUID(),
      issueId,
      userId,
      startTime,
      endTime,
      description,
      duration: endTime ? new Date(endTime).getTime() - new Date(startTime).getTime() : null,
      createdAt: new Date().toISOString(),
    });

    return c.json({ entry }, 201);
  } catch (error) {
    console.error('Error creating time entry:', error);
    return c.json({ error: 'Failed to create time entry' }, 500);
  }
});

/**
 * Update time tracking entry
 * PATCH /api/time-entries/:id
 */
api.patch('/time-entries/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const entryId = c.req.param('id');
  const body = await c.req.json();

  try {
    const db = DatabaseProviderFactory.getProvider(workspaceId);
    const entry = await db.updateTimeEntry(entryId, {
      ...body,
      updatedAt: new Date().toISOString(),
    });

    return c.json({ entry });
  } catch (error) {
    console.error('Error updating time entry:', error);
    return c.json({ error: 'Failed to update time entry' }, 500);
  }
});

/**
 * Delete time tracking entry
 * DELETE /api/time-entries/:id
 */
api.delete('/time-entries/:id', async (c) => {
  const workspaceId = c.get('workspaceId');
  const entryId = c.req.param('id');

  try {
    const db = DatabaseProviderFactory.getProvider(workspaceId);
    await db.deleteTimeEntry(entryId);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    return c.json({ error: 'Failed to delete time entry' }, 500);
  }
});

/**
 * Get analytics
 * GET /api/analytics
 * 
 * Query params:
 * - groupBy: issue | user | team | project
 * - startDate: Start date for analytics
 * - endDate: End date for analytics
 */
api.get('/analytics', async (c) => {
  const workspaceId = c.get('workspaceId');
  const { groupBy, startDate, endDate } = c.req.query();

  if (!groupBy || !startDate || !endDate) {
    return c.json({ error: 'Missing required query parameters' }, 400);
  }

  try {
    const db = DatabaseProviderFactory.getProvider(workspaceId);
    const analytics = await db.getAnalytics({
      groupBy: groupBy as 'issue' | 'user' | 'team' | 'project',
      startDate,
      endDate,
    });

    return c.json({ analytics });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

/**
 * Get synced Linear data (teams, projects, issues)
 * GET /api/linear/:type
 */
api.get('/linear/:type', async (c) => {
  const workspaceId = c.get('workspaceId');
  const type = c.req.param('type');

  if (!['teams', 'projects', 'issues', 'users'].includes(type)) {
    return c.json({ error: 'Invalid type' }, 400);
  }

  try {
    const db = DatabaseProviderFactory.getProvider(workspaceId);
    let data;

    switch (type) {
      case 'teams':
        data = await db.getTeams();
        break;
      case 'projects':
        data = await db.getProjects();
        break;
      case 'issues':
        data = await db.getIssues();
        break;
      case 'users':
        data = await db.getUsers();
        break;
    }

    return c.json({ [type]: data });
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return c.json({ error: `Failed to fetch ${type}` }, 500);
  }
});

/**
 * Get active timer for current user
 * GET /api/timer/active
 */
api.get('/timer/active', async (c) => {
  const workspaceId = c.get('workspaceId');
  const token = c.get('token');

  try {
    const userResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { viewer { id } }`,
      }),
    });

    const userData = await userResponse.json();
    const userId = userData.data?.viewer?.id;

    if (!userId) {
      return c.json({ error: 'Failed to get user info' }, 500);
    }

    const db = DatabaseProviderFactory.getProvider(workspaceId);
    const activeTimer = await db.getActiveTimer(userId);

    return c.json({ timer: activeTimer });
  } catch (error) {
    console.error('Error fetching active timer:', error);
    return c.json({ error: 'Failed to fetch active timer' }, 500);
  }
});

/**
 * Start timer
 * POST /api/timer/start
 */
api.post('/timer/start', async (c) => {
  const workspaceId = c.get('workspaceId');
  const token = c.get('token');
  const body = await c.req.json();

  const { issueId, description } = body;

  if (!issueId) {
    return c.json({ error: 'Issue ID is required' }, 400);
  }

  try {
    const userResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { viewer { id } }`,
      }),
    });

    const userData = await userResponse.json();
    const userId = userData.data?.viewer?.id;

    if (!userId) {
      return c.json({ error: 'Failed to get user info' }, 500);
    }

    const db = DatabaseProviderFactory.getProvider(workspaceId);
    
    await db.stopActiveTimer(userId);

    const entry = await db.createTimeEntry({
      id: crypto.randomUUID(),
      issueId,
      userId,
      startTime: new Date().toISOString(),
      endTime: null,
      description,
      duration: null,
      createdAt: new Date().toISOString(),
    });

    return c.json({ entry }, 201);
  } catch (error) {
    console.error('Error starting timer:', error);
    return c.json({ error: 'Failed to start timer' }, 500);
  }
});

/**
 * Stop timer
 * POST /api/timer/stop
 */
api.post('/timer/stop', async (c) => {
  const workspaceId = c.get('workspaceId');
  const token = c.get('token');

  try {
    const userResponse = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `query { viewer { id } }`,
      }),
    });

    const userData = await userResponse.json();
    const userId = userData.data?.viewer?.id;

    if (!userId) {
      return c.json({ error: 'Failed to get user info' }, 500);
    }

    const db = DatabaseProviderFactory.getProvider(workspaceId);
    const entry = await db.stopActiveTimer(userId);

    return c.json({ entry });
  } catch (error) {
    console.error('Error stopping timer:', error);
    return c.json({ error: 'Failed to stop timer' }, 500);
  }
});

export { api as apiRoutes };
