import { AuthFnValidationError, type AuthFnPlugin } from '@authfn/core';

export function nucleusLifecyclePlugin(): AuthFnPlugin {
  return {
    name: 'nucleusLifecycle',
    hooks: {
      beforeUserCreate: async (_ctx, input) => {
        const allowedDomains = readCsv(process.env.NUCLEUS_ALLOWED_EMAIL_DOMAINS);
        const email = typeof input.primaryEmail === 'string' ? input.primaryEmail : undefined;
        if (allowedDomains.length > 0 && email) {
          const domain = email.split('@')[1]?.toLowerCase();
          if (!domain || !allowedDomains.includes(domain)) {
            throw new AuthFnValidationError('Email domain is not allowed for this Nucleus account service', {
              domain
            });
          }
        }
        return input;
      },
      afterUserCreate: async (ctx, user) => {
        await ctx.config?.observability?.emit?.({
          type: 'authfn.user.created',
          requestId: requestId(ctx.request),
          userId: typeof user.id === 'string' ? user.id : undefined,
          regionId: ctx.runtime?.regionId,
          outcome: 'nucleus-profile-bootstrap',
          metadata: {
            product: 'nucleus'
          }
        });
      },
      beforeSessionIssue: async (ctx, input) => ({
        ...input,
        metadata: {
          ...(isRecord(input.metadata) ? input.metadata : {}),
          nucleus: {
            regionId: ctx.runtime?.regionId,
            product: 'nucleus'
          }
        },
        regionId: typeof input.regionId === 'string' ? input.regionId : ctx.runtime?.regionId
      })
    }
  };
}

function readCsv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requestId(request: Request | undefined): string {
  return request?.headers.get('x-request-id') ?? `req_${Date.now().toString(36)}`;
}
