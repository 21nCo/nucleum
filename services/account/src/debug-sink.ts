const DEFAULT_DEBUG_SINK_SOURCE = 'account-service';
const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'accessToken',
  'refreshToken',
  'challengeId',
  'clientSecret',
  'client_secret',
  'idToken',
  'id_token',
  'email',
  'identifier',
  'password',
  'otp',
  'code',
  'codeHash',
  'privateKey'
];

export interface AccountDebugSinkLog {
  level?: 'debug' | 'error' | 'info' | 'warn';
  source?: string;
  app?: string;
  product?: string;
  environment?: string;
  route?: string;
  message?: unknown;
  payload?: unknown;
  requestId?: string;
  userId?: string;
  tags?: unknown;
}

export function sendAccountDebugLog(log: AccountDebugSinkLog): void {
  const sinkUrl = readProcessEnv('DEBUG_SINK_URL')?.trim().replace(/\/$/, '');
  if (!sinkUrl || typeof fetch === 'undefined') {
    return;
  }

  const token = readProcessEnv('DEBUG_SINK_WRITE_TOKEN')?.trim();
  if (readProcessEnv('NODE_ENV') === 'production' && !token) {
    return;
  }
  const body = JSON.stringify(redact({
    level: log.level ?? 'info',
    source: log.source ?? DEFAULT_DEBUG_SINK_SOURCE,
    product: log.product ?? 'nucleus',
    environment: log.environment ?? readProcessEnv('NODE_ENV'),
    message: log.message,
    payload: log.payload ?? log.message,
    requestId: log.requestId,
    userId: log.userId,
    route: log.route,
    tags: log.tags
  }));
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  };
  if (token) {
    headers['x-debug-sink-token'] = token;
  }

  const context = globalThis as typeof globalThis & {
    ctx?: ExecutionContext;
  };
  const promise = fetch(`${sinkUrl}/v1/logs`, {
    method: 'POST',
    headers,
    body
  }).catch(() => {
    // Diagnostics must never affect auth behavior.
  });

  context.ctx?.waitUntil?.(promise);
}

function readProcessEnv(key: string): string | undefined {
  const globalProcess = globalThis as unknown as {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };
  return globalProcess.process?.env?.[key];
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) {
    return '<max-depth>';
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1));
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }
  if (typeof value === 'string') {
    return redactSensitiveString(value);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(record).map(([key, entry]) => [
      key,
      isSensitiveKey(key) ? '[REDACTED]' : redact(entry, depth + 1)
    ])
  );
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEYS.some((sensitive) => normalized.includes(sensitive.toLowerCase()));
}

function redactSensitiveString(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED]')
    .replace(/\b(chal|otp|state|code|token)_[A-Za-z0-9._~-]+\b/g, '[REDACTED]')
    .replace(/([?&](?:code|state|id_token|access_token|refresh_token)=)[^&\s]+/gi, '$1[REDACTED]');
}
