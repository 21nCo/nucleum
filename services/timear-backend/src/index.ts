import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serve } from '@hono/node-server';

import { oauthRoutes } from './routes/oauth';
import { webhookRoutes } from './routes/webhook';
import { apiRoutes } from './routes/api';

const app = new Hono();

app.use('/*', cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
app.use('/*', logger());

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'timear-backend' });
});

app.route('/oauth', oauthRoutes);
app.route('/webhook', webhookRoutes);
app.route('/api', apiRoutes);

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

app.onError((err, c) => {
  console.error(`Error: ${err.message}`, err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT || '3000');

console.log(`Starting Timear backend server on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
