import {
  AuthFnUnauthenticatedError,
  AuthFnValidationError,
  type AuthFnPlugin,
  type AuthFnPluginRuntimeContext,
  type AuthFnSession,
  type AuthFnUserRecord
} from 'authfn';
import { authenticateAccountMutation } from './request-auth.js';
import { createAuthFnRouteMeta } from 'authfn/http/router';
import { jsonSuccess } from 'authfn/http/envelopes';

type NucleusLifecycleRoute = ReturnType<NonNullable<AuthFnPlugin['routes']>>[number];

export interface NucleusLifecyclePluginOptions {
  /** Region ids the account service is configured with; bootstrap refuses any other `region`. */
  regionIds?: string[];
}

export function nucleusLifecyclePlugin(options: NucleusLifecyclePluginOptions = {}): AuthFnPlugin {
  return {
    name: 'nucleusLifecycle',
    routes: (ctx) => createNucleusLifecycleRoutes(ctx, options),
    hooks: {
      beforeUserCreate: async (ctx, input) => {
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
        const metadata = isRecord(input.metadata) ? input.metadata : {};
        const regionId = ctx.environment?.regionId;
        return {
          ...input,
          metadata: {
            ...metadata,
            nucleus: {
              ...readNucleusMetadata(metadata),
              isBootstrapped: true,
              ...(regionId ? { regionId } : {}),
              product: 'nucleus'
            }
          }
        };
      },
      afterUserCreate: async (ctx, user) => {
        await ctx.config?.observability?.events.emit({
          domain: 'authfn',
          type: 'authfn.user.created',
          requestId: requestId(ctx.request),
          userId: typeof user.id === 'string' ? user.id : undefined,
          regionId: ctx.environment?.regionId,
          outcome: 'nucleus-profile-bootstrap',
          metadata: {
            product: 'nucleus'
          }
        });
      },
      beforeSessionIssue: async (ctx, input) => {
        const userId = typeof input.userId === 'string' ? input.userId : undefined;
        const user = userId
          ? await ctx.config?.database.findOne<AuthFnUserRecord>({
              model: 'users',
              where: [{ field: 'id', operator: 'eq', value: userId }],
              namespace: ctx.config.namespace ?? 'authfn'
            })
          : null;
        const userNucleus = readNucleusMetadata(user?.metadata);

        return {
          ...input,
          metadata: {
            ...(isRecord(input.metadata) ? input.metadata : {}),
            nucleus: {
              ...userNucleus,
              regionId: ctx.environment?.regionId,
              product: 'nucleus'
            }
          },
          regionId: typeof input.regionId === 'string' ? input.regionId : ctx.environment?.regionId
        };
      }
    }
  };
}

function createNucleusLifecycleRoutes(
  ctx: AuthFnPluginRuntimeContext,
  options: NucleusLifecyclePluginOptions
): NucleusLifecycleRoute[] {
  return [
    {
      method: 'POST',
      path: '/nucleus/bootstrap',
      meta: createAuthFnRouteMeta('bootstrapNucleusAccount', 'Complete Nucleus account setup', {
        mode: 'hybrid',
        csrf: true
      }),
      handler: async (request) => {
        const session = await authenticateAccountMutation(ctx, request);
        if (!session || session.type !== 'session') {
          throw new AuthFnUnauthenticatedError('AuthFn session is required');
        }

        const body = await readJsonBody(request);
        const requestedRegionInput = typeof body.region === 'string'
          ? body.region.trim().toLowerCase()
          : '';
        const requestedRegion = requestedRegionInput.length > 0 ? requestedRegionInput : undefined;
        if (requestedRegion !== undefined && !isConfiguredRegion(requestedRegion, options, session.regionId)) {
          throw new AuthFnValidationError('Unknown region', { field: 'region' });
        }
        const regionId = requestedRegion ?? session.regionId;
        const now = new Date();
        const user = await ctx.config.database.findOne<AuthFnUserRecord>({
          model: 'users',
          where: [{ field: 'id', operator: 'eq', value: session.actorId }],
          namespace: ctx.namespace
        });
        if (!user) {
          throw new AuthFnUnauthenticatedError('AuthFn user is required');
        }

        const updatedNucleus = {
          ...readNucleusMetadata(user.metadata),
          isBootstrapped: true,
          regionId: regionId ?? session.regionId,
          product: 'nucleus'
        };
        const updatedUser = await ctx.config.database.update<AuthFnUserRecord>({
          model: 'users',
          where: [{ field: 'id', operator: 'eq', value: user.id }],
          data: {
            metadata: {
              ...(isRecord(user.metadata) ? user.metadata : {}),
              nucleus: updatedNucleus
            },
            updatedAt: now
          },
          namespace: ctx.namespace
        });

        const sessionMetadata = {
          ...(isRecord(session.metadata) ? session.metadata : {}),
          nucleus: {
            ...readNucleusMetadata(session.metadata),
            ...updatedNucleus
          }
        };
        await ctx.config.database.update({
          model: 'sessions',
          where: [{ field: 'id', operator: 'eq', value: session.id }],
          data: {
            metadata: sessionMetadata,
            updatedAt: now
          },
          namespace: ctx.namespace
        });

        return jsonSuccess(request, {
          user: updatedUser,
          session: {
            ...session,
            metadata: sessionMetadata,
            regionId: regionId ?? session.regionId
          } satisfies AuthFnSession
        });
      }
    }
  ];
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

function readNucleusMetadata(metadata: unknown): Record<string, unknown> {
  if (!isRecord(metadata)) {
    return {};
  }
  const nucleus = metadata.nucleus;
  return isRecord(nucleus) ? nucleus : {};
}

async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function requestId(request: Request | undefined): string {
  return request?.headers.get('x-request-id') ?? `req_${Date.now().toString(36)}`;
}

/** Accepts a bootstrap region only when it is one of the plugin's region ids (or the session's region when none are given). */
function isConfiguredRegion(
  region: string,
  options: NucleusLifecyclePluginOptions,
  sessionRegionId: string | undefined
): boolean {
  const allowed = options.regionIds ?? (sessionRegionId ? [sessionRegionId] : []);
  return allowed.some((regionId) => regionId.toLowerCase() === region);
}
