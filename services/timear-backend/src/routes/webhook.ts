import { Hono } from 'hono';
import { DatabaseProviderFactory } from '../providers/database-factory';

const webhook = new Hono();

/**
 * Linear Webhook Handler
 * 
 * Handles webhook events from Linear to sync workspace data:
 * - Teams
 * - Projects
 * - Issues
 * 
 * One-way sync: Linear → Timear only
 */

interface LinearWebhookPayload {
  action: string;
  type: string;
  data: any;
  url: string;
  createdAt: string;
  organizationId: string;
  webhookId: string;
}

/**
 * Verify Linear webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Linear webhook endpoint
 * POST /webhook/linear
 */
webhook.post('/linear', async (c) => {
  const signature = c.req.header('linear-signature');
  const webhookSecret = process.env.LINEAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('LINEAR_WEBHOOK_SECRET not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  const body = await c.req.text();
  
  if (signature && !verifyWebhookSignature(body, signature, webhookSecret)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload: LinearWebhookPayload = JSON.parse(body);
  const workspaceId = payload.organizationId;

  console.log(`Received webhook for workspace ${workspaceId}:`, {
    action: payload.action,
    type: payload.type,
  });

  try {
    const dbProvider = DatabaseProviderFactory.getProvider(workspaceId);

    switch (payload.type) {
      case 'Issue':
        await handleIssueWebhook(dbProvider, payload);
        break;
      case 'Project':
        await handleProjectWebhook(dbProvider, payload);
        break;
      case 'Team':
        await handleTeamWebhook(dbProvider, payload);
        break;
      case 'User':
        await handleUserWebhook(dbProvider, payload);
        break;
      default:
        console.log(`Unhandled webhook type: ${payload.type}`);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return c.json({ error: 'Webhook processing failed' }, 500);
  }
});

/**
 * Handle Issue webhooks
 */
async function handleIssueWebhook(db: any, payload: LinearWebhookPayload) {
  const { action, data } = payload;

  switch (action) {
    case 'create':
    case 'update':
      await db.upsertIssue({
        id: data.id,
        title: data.title,
        description: data.description,
        state: data.state?.name,
        priority: data.priority,
        assigneeId: data.assignee?.id,
        projectId: data.project?.id,
        teamId: data.team?.id,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        url: data.url,
      });
      break;
    case 'remove':
      await db.deleteIssue(data.id);
      break;
  }
}

/**
 * Handle Project webhooks
 */
async function handleProjectWebhook(db: any, payload: LinearWebhookPayload) {
  const { action, data } = payload;

  switch (action) {
    case 'create':
    case 'update':
      await db.upsertProject({
        id: data.id,
        name: data.name,
        description: data.description,
        state: data.state,
        leadId: data.lead?.id,
        teamIds: data.teams?.map((t: any) => t.id) || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        url: data.url,
      });
      break;
    case 'remove':
      await db.deleteProject(data.id);
      break;
  }
}

/**
 * Handle Team webhooks
 */
async function handleTeamWebhook(db: any, payload: LinearWebhookPayload) {
  const { action, data } = payload;

  switch (action) {
    case 'create':
    case 'update':
      await db.upsertTeam({
        id: data.id,
        name: data.name,
        key: data.key,
        description: data.description,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
      break;
    case 'remove':
      await db.deleteTeam(data.id);
      break;
  }
}

/**
 * Handle User webhooks
 */
async function handleUserWebhook(db: any, payload: LinearWebhookPayload) {
  const { action, data } = payload;

  switch (action) {
    case 'create':
    case 'update':
      await db.upsertUser({
        id: data.id,
        name: data.name,
        email: data.email,
        avatarUrl: data.avatarUrl,
        isActive: data.active,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
      break;
    case 'remove':
      await db.deleteUser(data.id);
      break;
  }
}

export { webhook as webhookRoutes };
