import {
  AuthFnUnauthenticatedError,
  type AuthFnPlugin,
  type AuthFnPluginRuntimeContext,
  type AuthFnSchemaDefinition
} from 'authfn';
import { authenticateRequest, hashSecret } from 'authfn/core/sessions';
import { createAuthFnRouteMeta } from 'authfn/http/router';
import { jsonSuccess } from 'authfn/http/envelopes';
import { nucleusWidgetTokenTables } from './widget-token.schema.js';

type WidgetTokenRoute = ReturnType<NonNullable<AuthFnPlugin['routes']>>[number];

interface WidgetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  scopes: string[];
  regionId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function nucleusWidgetTokenPlugin(): AuthFnPlugin {
  return {
    name: 'nucleusWidgetTokens',
    schema: () => createNucleusWidgetTokenSchema(),
    routes: (ctx) => createWidgetTokenRoutes(ctx),
    hooks: {
      afterAccountDelete: async (ctx, result) => {
        await ctx.config?.database.deleteMany({
          model: 'widget_tokens',
          where: [{ field: 'userId', operator: 'eq', value: result.userId }],
          namespace: ctx.config.namespace ?? 'authfn'
        });
      }
    }
  };
}

/**
 * Returns the AuthFn storage tables owned by the Nucleus widget-token plugin.
 */
export function createNucleusWidgetTokenSchema(): AuthFnSchemaDefinition['schemas'] {
  return nucleusWidgetTokenTables;
}

function createWidgetTokenRoutes(ctx: AuthFnPluginRuntimeContext): WidgetTokenRoute[] {
  return [
    {
      method: 'POST',
      path: '/widget-token',
      meta: createAuthFnRouteMeta('createWidgetToken', 'Issue a scoped Nucleus widget token', {
        mode: 'bearer'
      }),
      handler: async (request) => {
        const session = await authenticateRequest(ctx.config, request);
        if (!session || session.type !== 'session') {
          throw new AuthFnUnauthenticatedError('Native bearer session is required');
        }

        const now = new Date();
        const token = `wt_${crypto.randomUUID().replaceAll('-', '')}`;
        const record: WidgetTokenRecord = {
          id: `widget_${crypto.randomUUID().replaceAll('-', '')}`,
          userId: session.actorId,
          tokenHash: hashSecret(token),
          scopes: ['widget:read', 'nucleus:read'],
          regionId: session.regionId ?? 'unknown',
          expiresAt: new Date(now.getTime() + 60 * 60 * 1000),
          revokedAt: null,
          createdAt: now,
          updatedAt: now
        };

        await ctx.config.database.create<WidgetTokenRecord>({
          model: 'widget_tokens',
          data: record,
          namespace: ctx.namespace
        });

        return jsonSuccess(request, {
          token,
          tokenType: 'Bearer',
          scopes: record.scopes,
          expiresAt: record.expiresAt.toISOString(),
          regionId: record.regionId
        });
      }
    },
    {
      method: 'GET',
      path: '/widget-token/session',
      meta: createAuthFnRouteMeta('getWidgetTokenSession', 'Resolve a scoped Nucleus widget token', {
        mode: 'bearer'
      }),
      handler: async (request) => {
        const token = readBearerToken(request);
        if (!token) {
          throw new AuthFnUnauthenticatedError('Widget token is required');
        }

        const matches = await ctx.config.database.findMany<WidgetTokenRecord>({
          model: 'widget_tokens',
          where: [{ field: 'tokenHash', operator: 'eq', value: hashSecret(token) }],
          namespace: ctx.namespace
        });
        const record = matches[0];
        if (!record || record.revokedAt || new Date(record.expiresAt).getTime() <= Date.now()) {
          throw new AuthFnUnauthenticatedError('Widget token is invalid');
        }

        return jsonSuccess(request, {
          userId: record.userId,
          scopes: record.scopes,
          regionId: record.regionId,
          expiresAt: record.expiresAt.toISOString()
        });
      }
    },
    {
      method: 'POST',
      path: '/widget-token/revoke',
      meta: createAuthFnRouteMeta('revokeWidgetToken', 'Revoke scoped Nucleus widget tokens', {
        mode: 'bearer'
      }),
      handler: async (request) => {
        const session = await authenticateRequest(ctx.config, request);
        if (!session || session.type !== 'session') {
          throw new AuthFnUnauthenticatedError('Native bearer session is required');
        }

        const now = new Date();
        const active = await ctx.config.database.findMany<WidgetTokenRecord>({
          model: 'widget_tokens',
          where: [{ field: 'userId', operator: 'eq', value: session.actorId }],
          namespace: ctx.namespace
        });

        let revoked = 0;
        for (const token of active) {
          if (token.revokedAt) {
            continue;
          }
          await ctx.config.database.update<WidgetTokenRecord>({
            model: 'widget_tokens',
            where: [{ field: 'id', operator: 'eq', value: token.id }],
            data: {
              revokedAt: now,
              updatedAt: now
            },
            namespace: ctx.namespace
          });
          revoked += 1;
        }

        return jsonSuccess(request, {
          revoked
        });
      }
    }
  ];
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  const token = header.slice('bearer '.length).trim();
  return token.length > 0 ? token : null;
}
