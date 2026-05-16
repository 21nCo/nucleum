export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  DEBUG_SINK_WRITE_TOKEN?: string;
  DEBUG_SINK_READ_TOKEN?: string;
  DEBUG_SINK_ALLOW_UNAUTHENTICATED?: string;
}

interface DebugLogInput {
  level?: string;
  source?: string;
  app?: string;
  product?: string;
  environment?: string;
  sessionId?: string;
  installId?: string;
  userId?: string;
  regionId?: string;
  route?: string;
  message?: unknown;
  payload?: unknown;
  userAgent?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  appVersion?: string;
  requestId?: string;
  tags?: unknown;
}

const MAX_LOGS_PER_REQUEST = 50;
const MAX_TEXT_LENGTH = 12_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), request, env);
    }

    if (url.pathname === '/health') {
      return json(request, env, { ok: true, service: 'nucleus-debug-sink' });
    }

    if (url.pathname === '/v1/logs' && request.method === 'POST') {
      return handleWrite(request, env);
    }

    if (url.pathname === '/v1/logs' && request.method === 'GET') {
      return handleRead(request, env);
    }

    return json(request, env, { ok: false, error: 'not_found' }, 404);
  }
};

async function handleWrite(request: Request, env: Env): Promise<Response> {
  if (!hasToken(request, env.DEBUG_SINK_WRITE_TOKEN, env)) {
    return json(request, env, { ok: false, error: 'unauthorized' }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, env, { ok: false, error: 'invalid_json' }, 400);
  }

  const inputs = Array.isArray((body as { logs?: unknown })?.logs)
    ? ((body as { logs: unknown[] }).logs)
    : Array.isArray(body)
      ? body
      : [body];
  const logs = inputs
    .slice(0, MAX_LOGS_PER_REQUEST)
    .map((entry) => normalizeLog(entry, request));

  if (logs.length === 0) {
    return json(request, env, { ok: false, error: 'empty_logs' }, 400);
  }

  const statements = logs.map((log) => env.DB.prepare(`
    INSERT INTO debug_logs (
      id, received_at, level, source, app, product, environment, session_id, install_id,
      user_id, region_id, route, message, payload, user_agent, os, os_version, device,
      app_version, request_id, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    log.id,
    log.receivedAt,
    log.level,
    log.source,
    log.app,
    log.product,
    log.environment,
    log.sessionId,
    log.installId,
    log.userId,
    log.regionId,
    log.route,
    log.message,
    log.payload,
    log.userAgent,
    log.os,
    log.osVersion,
    log.device,
    log.appVersion,
    log.requestId,
    log.tags
  ));

  await env.DB.batch(statements);

  return json(request, env, {
    ok: true,
    inserted: logs.length,
    ids: logs.map((log) => log.id)
  });
}

async function handleRead(request: Request, env: Env): Promise<Response> {
  if (!hasToken(request, env.DEBUG_SINK_READ_TOKEN, env)) {
    return json(request, env, { ok: false, error: 'unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const limit = clamp(Number(url.searchParams.get('limit') ?? '100'), 1, 500);
  const app = url.searchParams.get('app');
  const source = url.searchParams.get('source');
  const level = url.searchParams.get('level');
  const since = Number(url.searchParams.get('since') ?? '0');

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (app) {
    conditions.push('app = ?');
    params.push(app);
  }
  if (source) {
    conditions.push('source = ?');
    params.push(source);
  }
  if (level) {
    conditions.push('level = ?');
    params.push(level);
  }
  if (Number.isFinite(since) && since > 0) {
    conditions.push('received_at >= ?');
    params.push(since);
  }

  params.push(limit);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await env.DB.prepare(`
    SELECT * FROM debug_logs
    ${where}
    ORDER BY received_at DESC
    LIMIT ?
  `).bind(...params).all();

  return json(request, env, {
    ok: true,
    logs: result.results ?? []
  });
}

function normalizeLog(input: unknown, request: Request) {
  const record = isRecord(input) ? input : { message: input };
  const payload = normalizePayload(record.payload ?? record);
  const message = normalizeMessage(record.message ?? record.at ?? record.event ?? record.error);

  return {
    id: stringValue(record.id) ?? crypto.randomUUID(),
    receivedAt: Date.now(),
    level: stringValue(record.level)?.toLowerCase() ?? 'info',
    source: stringValue(record.source) ?? 'unknown',
    app: stringValue(record.app),
    product: stringValue(record.product),
    environment: stringValue(record.environment ?? record.env),
    sessionId: stringValue(record.sessionId ?? record.session_id),
    installId: stringValue(record.installId ?? record.install_id),
    userId: stringValue(record.userId ?? record.user_id),
    regionId: stringValue(record.regionId ?? record.region_id),
    route: stringValue(record.route ?? record.path),
    message,
    payload,
    userAgent: stringValue(record.userAgent ?? request.headers.get('user-agent')),
    os: stringValue(record.os),
    osVersion: stringValue(record.osVersion ?? record.os_version),
    device: stringValue(record.device),
    appVersion: stringValue(record.appVersion ?? record.app_version),
    requestId: stringValue(record.requestId ?? record.request_id),
    tags: normalizePayload(record.tags)
  };
}

function normalizeMessage(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return truncate(value);
  return truncate(JSON.stringify(value));
}

function normalizePayload(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    return truncate(JSON.stringify(value));
  } catch {
    return truncate(String(value));
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? truncate(value) : null;
}

function truncate(value: string): string {
  return value.length > MAX_TEXT_LENGTH ? `${value.slice(0, MAX_TEXT_LENGTH)}...<truncated>` : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function hasToken(request: Request, configuredToken: string | undefined, env: Env): boolean {
  if (!configuredToken) {
    return env.DEBUG_SINK_ALLOW_UNAUTHENTICATED === 'true';
  }
  const url = new URL(request.url);
  const provided = request.headers.get('x-debug-sink-token')
    ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    ?? url.searchParams.get('token');
  return provided === configuredToken;
}

function json(request: Request, env: Env, value: unknown, status = 200): Response {
  return withCors(Response.json(value, { status }), request, env);
}

function withCors(response: Response, request: Request, env: Env): Response {
  const origin = request.headers.get('origin');
  const allowed = resolveAllowedOrigin(origin, env.ALLOWED_ORIGINS);
  const headers = new Headers(response.headers);
  headers.set('access-control-allow-origin', allowed);
  headers.set('access-control-allow-methods', 'GET,POST,OPTIONS');
  headers.set('access-control-allow-headers', 'content-type,authorization,x-debug-sink-token');
  headers.set('access-control-max-age', '86400');
  headers.set('vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function resolveAllowedOrigin(origin: string | null, configured: string | undefined): string {
  const allowed = (configured ?? '*')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (allowed.includes('*')) return '*';
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0] ?? '*';
}
