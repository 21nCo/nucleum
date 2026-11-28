import type { Hono } from 'hono';
import { McpFnError, type McpFnRequestExtra } from '@mcpfn/core';
import { interfaceApps, type InterfaceApp } from '@nucleum/schema/interfaces';
import {
  authenticateAppToken,
  createInterfaceApiRouter,
  toProblem,
  type InterfaceApiServices
} from '../api/router.js';
import { ApiProblem } from '../api/problem.js';
import { createInterfaceMcpServer, type McpCaller } from './tools.js';

export interface RegisterInterfaceMcpRoutesInput {
  app: Hono;
  services: InterfaceApiServices;
}

type McpHandler = (request: Request, options?: { authInfo?: McpAuthInfo }) => Promise<Response>;

/** What the route hands the MCP transport for an authenticated request. */
interface McpAuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
  extra: { subject: string; caller: McpCaller };
}

/**
 * Serves each app's MCP server at `/mcp/<app>` over stateless Streamable
 * HTTP, answering with JSON. Every request must carry a personal access
 * token as a Bearer token that holds the app's read scope (a `nucleum`
 * token covers every app); tools/list then shows the tools the token's
 * scopes allow. Tools call the app's v1 API as the token. A failure outside
 * a tool answers with the problem the v1 API would give, and only its class
 * is logged, never its message, which can quote stored content.
 */
export function registerInterfaceMcpRoutes(input: RegisterInterfaceMcpRoutesInput): void {
  const handlers = new Map<InterfaceApp, Promise<McpHandler>>();
  const handlerFor = (app: InterfaceApp): Promise<McpHandler> => {
    let handler = handlers.get(app);
    if (!handler) {
      const { declaration, toolVisibility } = createInterfaceMcpServer(app);
      handler = declaration.createServer({
        context: callerFromRequest,
        toolVisibility,
        onError: ({ error, errorId, method, tool }) => input.services.logError?.(
          `MCP ${method}${tool ? ` ${tool}` : ''} failed (${errorId})`,
          { name: error instanceof Error ? error.name : typeof error }
        )
      }).createWebStandardHandler({ sessionIdGenerator: undefined, enableJsonResponse: true }) as Promise<McpHandler>;
      handler.catch(() => handlers.delete(app));
      handlers.set(app, handler);
    }
    return handler;
  };
  const routers = new Map(interfaceApps.map((app) => [app, createInterfaceApiRouter(app, input.services)]));
  input.app.all('/mcp/:app', async (c) => {
    const app = c.req.param('app') as InterfaceApp;
    const router = routers.get(app);
    if (!router) return new ApiProblem(404, 'not_found', 'No MCP server is served at this path.').toResponse();
    try {
      const authInfo = await authenticate(app, c.req.raw, input.services, (request) => router.handle(request));
      return await (await handlerFor(app))(c.req.raw, { authInfo });
    } catch (error) {
      return toProblem(error, input.services, `MCP ${app} request failed`).toResponse();
    }
  });
}

/**
 * Authenticates the bearer token as the v1 API does and requires the app's
 * read scope. Returns the transport's auth info, which carries the scopes
 * the token holds for the app and a v1 API client acting as it.
 */
async function authenticate(
  app: InterfaceApp,
  request: Request,
  services: InterfaceApiServices,
  dispatch: (request: Request) => Promise<Response>
): Promise<McpAuthInfo> {
  const { session, scopes } = await authenticateAppToken(app, 'read', request, services);
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const origin = new URL(request.url).origin;
  const caller: McpCaller = {
    app,
    scopes,
    callApi: ({ method, path, query, body, idempotencyKey }) => {
      const url = new URL(path, origin);
      if (url.pathname !== path) throw new Error('An MCP tool built an API path that URL parsing changes.');
      if (query) url.search = query.toString();
      const apiHeaders = new Headers({ authorization, accept: 'application/json' });
      if (body) apiHeaders.set('content-type', 'application/json');
      if (idempotencyKey !== undefined) apiHeaders.set('idempotency-key', idempotencyKey);
      return dispatch(new Request(url, {
        method,
        headers: apiHeaders,
        ...(body ? { body: JSON.stringify(body) } : {})
      }));
    }
  };
  return {
    token: authorization.replace(/^bearer\s+/i, ''),
    clientId: session.id,
    scopes,
    extra: { subject: session.actorId, caller }
  };
}

/** The caller the route authenticated, from the transport's auth info. */
function callerFromRequest(extra: McpFnRequestExtra): McpCaller {
  const caller = (extra.authInfo?.extra as { caller?: McpCaller } | undefined)?.caller;
  if (!caller) throw new McpFnError('unauthenticated', 'The request was not authenticated.');
  return caller;
}
