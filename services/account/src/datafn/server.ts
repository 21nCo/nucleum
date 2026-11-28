import {
  createDatafnPublicLinksPlugin,
  datafnMultiRegionPlugin,
  datafn,
  type DatafnApp,
  type DataFnAction,
  type DatafnPublicLinksPlugin,
  type DatafnPublicLinkPrincipal,
  type DatafnRouteHookInput,
  type RateLimitConfig,
  type DatafnServer,
  type SearchProvider
} from '@datafn/server';
import type { AuthFnSession } from 'authfn';
import {
  wrapWithRowLevelNamespace,
  type Adapter,
  type RuntimeStores
} from '@superfunctions/db';
import type { SuperfunctionObservability } from '@superfunctions/observability';
import { nucleumDatafnSchema } from '@nucleum/schema/datafn';
import { createSyncSearchProvider } from './search-provider.js';
import { resolveAccountUserNamespace } from './namespace.js';
import { readPositiveIntegerEnv } from './env.js';
import type { CapturedFileDeletions, FileDeletionCascade } from './file-deletions.js';
import {
  authorizeAppScopes,
  filterScopedResponseBody,
  hasFullAppAccess,
  resolveAppScopeAccess,
  type AppScopeStore
} from './app-scopes.js';

export {
  resolveAccountUserNamespace,
  resolveAccountUserPrincipal
} from './namespace.js';

export interface SyncContext {
  request: Request;
  session: AuthFnSession | null;
  publicLink: DatafnPublicLinkPrincipal | null;
  regionId?: string;
}

export interface SyncAuthProvider {
  authenticate(request: Request): Promise<AuthFnSession | null> | AuthFnSession | null;
  authorizeMutation(request: Request): Promise<AuthFnSession>;
}

export type SyncClientIpResolver = (
  request: Request
) => string | undefined | Promise<string | undefined>;

export interface CreateSyncServerInput {
  auth: SyncAuthProvider;
  database: Adapter;
  stores?: RuntimeStores;
  rateLimit?: false | RateLimitConfig<SyncContext>;
  /**
   * Trusted client IP for a request, used as the rate-limit key for requests
   * with neither a session nor a public link. Without it they share one
   * `anonymous` bucket.
   */
  resolveClientIp?: SyncClientIpResolver;
  regionId?: string;
  observability?: SuperfunctionObservability;
  searchProvider?: SearchProvider;
  /**
   * Deletes the FileFn file behind each `file` record a write by a session
   * holding every app scope permanently deletes, and retries owed deletions
   * after authenticated requests. Omitted, records are deleted without
   * touching FileFn.
   */
  fileDeletions?: FileDeletionCascade;
}

export type SyncServer = DatafnServer<SyncContext>;

/**
 * Sync app declaration with public-link plugin access.
 */
export interface SyncApp extends DatafnApp {
  publicLinks: DatafnPublicLinksPlugin<AuthFnSession>;
}

/**
 * Declares the account-service sync app for codegen and runtime use.
 */
export function sync(): SyncApp {
  const publicLinks = createDatafnPublicLinksPlugin<AuthFnSession>({
    getOwnerActorId: (session) => session.actorId,
    getOwnerNamespace: (actorId) => resolveAccountUserNamespace(actorId)
  });
  return Object.assign(datafn({
    schema: nucleumDatafnSchema,
    plugins: [publicLinks]
  }), { publicLinks });
}

export const syncApp = sync();

export function createSyncServer(
  input: CreateSyncServerInput
): Promise<SyncServer> {
  const app = syncApp;
  const runtimePublicLinks = createDatafnPublicLinksPlugin<AuthFnSession>({
    authenticateOwner: async (request) => {
      const session = await authorizeMutationRequest(input.auth, request);
      return session && isUnscopedUserSession(session) ? session : null;
    },
    getOwnerActorId: (session) => session.actorId,
    getOwnerNamespace: (actorId) => resolveAccountUserNamespace(actorId),
    directory: input.stores?.directory,
    resourceRegion: input.regionId ?? process.env.ACCOUNT_REGION_ID
  });
  const runtimePlugins = [
    runtimePublicLinks,
    ...(input.stores?.directory && (input.regionId ?? process.env.ACCOUNT_REGION_ID)
      ? [
          datafnMultiRegionPlugin({
            regionId: input.regionId ?? process.env.ACCOUNT_REGION_ID ?? 'default',
            directory: input.stores.directory
          })
        ]
      : [])
  ];
  const publicLinks = runtimePublicLinks;
  const scopedDatabase = wrapWithRowLevelNamespace(input.database, {
    enabled: true,
    columnName: '__ns',
    mandatory: true
  });
  const scopeStore = (session: AuthFnSession): AppScopeStore => {
    const namespace = resolveAccountUserNamespace(session.actorId);
    return {
      findMany: (model, where) =>
        scopedDatabase.findMany<Record<string, unknown>>({
          model,
          where: where.map((clause) => ({ ...clause })),
          namespace
        })
    };
  };
  const regionHeader = input.regionId ?? process.env.ACCOUNT_REGION_ID;
  const capturedFileDeletions = new WeakMap<object, CapturedFileDeletions>();
  const settleFileDeletions = async (
    hook: DatafnRouteHookInput<SyncContext>
  ): Promise<Response> => {
    if (!input.fileDeletions) return hook.response;
    const captured = capturedFileDeletions.get(hook.context);
    if (captured) {
      capturedFileDeletions.delete(hook.context);
      const body: unknown = captured.requested.length > 0
        ? await hook.response.clone().json().catch(() => undefined)
        : undefined;
      await input.fileDeletions.settle(captured, body);
    }
    if (hook.context.session) input.fileDeletions.sweep();
    return hook.response;
  };
  return app.createServer<SyncContext>({
    database: input.database,
    stores: input.stores,
    plugins: runtimePlugins,
    searchProvider: input.searchProvider ?? createSyncSearchProvider({
      observability: input.observability,
      regionId: input.regionId ?? process.env.ACCOUNT_REGION_ID
    }),
    allowUnknownResources: false,
    context: async (request) => {
      const publicLinkToken = publicLinks.readToken(request);
      const publicLink = publicLinkToken
        ? await publicLinks.resolve(input.database, publicLinkToken)
        : null;
      const session = publicLinkToken
        ? null
        : await input.auth.authenticate(request);
      return {
        request,
        session,
        publicLink,
        regionId: input.regionId ?? process.env.ACCOUNT_REGION_ID
      };
    },
    authorize: async (ctx, action, payload) => {
      if (ctx.session) {
        if (ctx.session.actorType !== 'user') return false;
        const access = resolveAppScopeAccess(ctx.session);
        if (!hasFullAppAccess(access)) {
          const allowed = await authorizeAppScopes({
            access,
            action,
            payload,
            schema: nucleumDatafnSchema,
            store: scopeStore(ctx.session)
          });
          if (!allowed) return false;
        }
        if (!MUTATING_DATAFN_ACTIONS.has(action)) return true;
        if (!(await authorizeMutationRequest(input.auth, ctx.request))) return false;
        if (input.fileDeletions && hasFullAppAccess(access)) {
          const captured = await input.fileDeletions.capture(
            action, payload, ctx.session.actorId
          );
          if (captured) capturedFileDeletions.set(ctx, captured);
        }
        return true;
      }
      if (!ctx.publicLink) return false;
      return true;
    },
    namespaceProvider: {
      getNamespace: (ctx) => {
        if (ctx.publicLink) {
          return ctx.publicLink.namespace;
        }
        const actorId = requireActorId(ctx);
        return resolveAccountUserNamespace(actorId);
      },
      getActorId: (ctx) => ctx.publicLink?.actorId ?? requireActorId(ctx)
    },
    limits: {
      maxPayloadBytes:
        readPositiveIntegerEnv('DATAFN_MAX_PAYLOAD_BYTES') ?? 5_242_880
    },
    rateLimit: input.rateLimit === false
      ? undefined
      : {
          keyExtractor: (ctx: SyncContext) =>
            resolveSyncRateLimitKey(ctx, input.resolveClientIp),
          ...(input.rateLimit ?? createDefaultRateLimit(input.stores))
        },
    routeHooks: {
      afterResponse: [
        settleFileDeletions,
        (hook) => filterScopedResponse(hook, scopeStore)
      ],
      ...(regionHeader ? { headers: { 'x-datafn-region': regionHeader } } : {})
    },
    observability: input.observability
  });
}

/**
 * Rate-limit bucket for a DataFn request. A public-link request counts against
 * its link, not the link owner's namespace, so link traffic cannot lock the
 * owner out. A signed-in request counts against the user's namespace, and a
 * request with neither counts against the client IP when it is known.
 */
export async function resolveSyncRateLimitKey(
  ctx: SyncContext,
  resolveClientIp?: SyncClientIpResolver
): Promise<string> {
  if (ctx.publicLink) {
    return `public_link:${ctx.publicLink.linkId}`;
  }
  const actorId = ctx.session?.actorId;
  if (actorId) {
    return resolveAccountUserNamespace(actorId);
  }
  const clientIp = (await resolveClientIp?.(ctx.request))?.trim();
  return clientIp ? `ip:${clientIp}` : 'anonymous';
}

function createDefaultRateLimit(
  stores: RuntimeStores | undefined
): RateLimitConfig<SyncContext> {
  const cloneMaxRequests =
    readPositiveIntegerEnv('DATAFN_RATE_LIMIT_CLONE_MAX_REQUESTS') ?? 20;
  const cloneWindowSeconds =
    readPositiveIntegerEnv('DATAFN_RATE_LIMIT_CLONE_WINDOW_SECONDS') ?? 60;

  return {
    enabled: true,
    mode: stores?.atomicKv ? 'strict' : stores?.kv ? 'best-effort' : 'local',
    maxRequests: 120,
    windowSeconds: 60,
    endpoints: {
      query: { maxRequests: 120, windowSeconds: 60 },
      search: { maxRequests: 60, windowSeconds: 60 },
      mutation: { maxRequests: 60, windowSeconds: 60 },
      transact: { maxRequests: 30, windowSeconds: 60 },
      push: { maxRequests: 60, windowSeconds: 60 },
      pull: { maxRequests: 120, windowSeconds: 60 },
      clone: {
        maxRequests: cloneMaxRequests,
        windowSeconds: cloneWindowSeconds
      },
      reconcile: { maxRequests: 60, windowSeconds: 60 },
      seed: { maxRequests: 10, windowSeconds: 60 }
    }
  };
}

export default syncApp;

function requireActorId(ctx: SyncContext): string {
  const actorId = ctx.session?.actorId;
  if (!actorId) {
    throw new Error('AuthFn session actor is required');
  }
  return actorId;
}

const MUTATING_DATAFN_ACTIONS = new Set<DataFnAction>([
  'mutation',
  'transact',
  'seed',
  'push',
  'reconcile'
]);

async function authorizeMutationRequest(
  auth: SyncAuthProvider,
  request: Request
): Promise<AuthFnSession | null> {
  try {
    return await auth.authorizeMutation(request);
  } catch {
    return null;
  }
}

/**
 * Share-link management acts on any record in the namespace, so only user
 * sessions that hold every app scope may create or revoke links.
 */
function isUnscopedUserSession(session: AuthFnSession): boolean {
  return session.actorType === 'user' &&
    hasFullAppAccess(resolveAppScopeAccess(session));
}

/**
 * Filters DataFn query and transact responses for an app-scoped session:
 * strips space items outside its read grant and drops view and link tag rows
 * it may not read. Other responses pass through unchanged.
 */
async function filterScopedResponse(
  hook: DatafnRouteHookInput<SyncContext>,
  scopeStore: (session: AuthFnSession) => AppScopeStore
): Promise<Response> {
  const session = hook.context.session;
  if (!session || (hook.action !== 'query' && hook.action !== 'transact')) {
    return hook.response;
  }
  const grant = resolveAppScopeAccess(session).read;
  if (grant === 'all' || !hook.response.ok) return hook.response;
  const body: unknown = await hook.response.clone().json().catch(() => undefined);
  if (body === undefined) return hook.response;
  const filtered = await filterScopedResponseBody(
    hook.action, hook.payload, body, grant, scopeStore(session), nucleumDatafnSchema
  );
  if (filtered === body) return hook.response;
  const headers = new Headers(hook.response.headers);
  headers.delete('content-length');
  return new Response(JSON.stringify(filtered), {
    status: hook.response.status,
    statusText: hook.response.statusText,
    headers
  });
}
