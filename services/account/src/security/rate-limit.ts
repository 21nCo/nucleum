import { createRateLimiter } from '@superfunctions/middleware';
import type { KVStoreAdapter } from '@superfunctions/db';
import type { AuthFnEvent } from '@authfn/core';
import type { Context, Next } from 'hono';

export function createAccountRateLimitMiddleware(
  cacheStore?: KVStoreAdapter,
  options: {
    emit?: (event: AuthFnEvent) => Promise<void> | void;
  } = {}
) {
  const limiter = createRateLimiter({
    windowMs: 60_000,
    maxRequests: 120,
    keyPrefix: 'authfn:nucleus_account:ratelimit:',
    persistence: cacheStore,
    algorithm: 'sliding-window'
  });

  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname;
    const identifier = await readIdentifier(c.req.raw.clone() as globalThis.Request);
    const ip = c.req.header('cf-connecting-ip')
      ?? c.req.header('x-forwarded-for')
      ?? 'unknown';
    const policy = policyForPath(path);
    const checks = await buildChecks(policy, ip, identifier);
    let blocked:
      | {
          result: Awaited<ReturnType<typeof limiter.check>>;
          dimension: string;
        }
      | null = null;

    for (const check of checks) {
      const result = await limiter.check(check);
      if (!result.allowed) {
        blocked = {
          result,
          dimension: check.dimension
        };
        break;
      }
    }

    if (blocked) {
      const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
      await options.emit?.({
        type: 'authfn.rate_limited',
        requestId,
        outcome: 'blocked',
        metadata: {
          path,
          scope: policy.scope,
          dimension: blocked.dimension,
          hasIdentifier: Boolean(identifier),
          resetAt: blocked.result.resetAt
        }
      });

      return c.json({
        ok: false,
        error: {
          code: 'AUTHFN_RATE_LIMITED',
          message: 'Request is temporarily rate limited',
          retryable: true,
          details: {
            resetAt: blocked.result.resetAt
          }
        },
        requestId
      }, 429);
    }

    return next();
  };
}

interface AccountRateLimitPolicy {
  scope: string;
  ipLimit: number;
  identifierLimit?: number;
  windowSeconds: number;
}

interface AccountRateLimitCheck {
  key: string;
  limit: number;
  windowSeconds: number;
  dimension: string;
}

async function buildChecks(
  policy: AccountRateLimitPolicy,
  ip: string,
  identifier: string | null
): Promise<AccountRateLimitCheck[]> {
  const checks: AccountRateLimitCheck[] = [
    {
      key: `${policy.scope}:ip:${hashKeyPart(ip)}`,
      limit: policy.ipLimit,
      windowSeconds: policy.windowSeconds,
      dimension: 'ip'
    }
  ];

  if (identifier && policy.identifierLimit) {
    checks.push({
      key: `${policy.scope}:identifier:${await hashIdentifier(identifier)}`,
      limit: policy.identifierLimit,
      windowSeconds: policy.windowSeconds,
      dimension: 'identifier'
    });
  }

  return checks;
}

function policyForPath(path: string): AccountRateLimitPolicy {
  if (path.endsWith('/sign-in/password')) return { scope: 'password', ipLimit: 30, identifierLimit: 10, windowSeconds: 60 };
  if (path.endsWith('/otp/send')) return { scope: 'otp-send', ipLimit: 20, identifierLimit: 5, windowSeconds: 300 };
  if (path.endsWith('/otp/verify')) return { scope: 'otp-verify', ipLimit: 30, identifierLimit: 10, windowSeconds: 300 };
  if (path.endsWith('/password/reset/start')) return { scope: 'password-reset', ipLimit: 20, identifierLimit: 5, windowSeconds: 300 };
  if (path.endsWith('/social/start')) return { scope: 'social-start', ipLimit: 60, windowSeconds: 60 };
  if (path.includes('/handoff/')) return { scope: 'handoff', ipLimit: 30, windowSeconds: 60 };
  if (path.endsWith('/regions/lookup')) return { scope: 'region-lookup', ipLimit: 120, identifierLimit: 60, windowSeconds: 60 };
  return { scope: 'account', ipLimit: 120, windowSeconds: 60 };
}

function hashKeyPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 128);
}

async function hashIdentifier(identifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identifier));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function readIdentifier(request: Request): Promise<string | null> {
  if (request.method !== 'POST') {
    return null;
  }

  try {
    const body = await request.json() as { email?: unknown; identifier?: unknown };
    const value = typeof body.email === 'string'
      ? body.email
      : typeof body.identifier === 'string'
        ? body.identifier
        : undefined;
    return value?.trim().toLowerCase() ?? null;
  } catch {
    return null;
  }
}
