import type { Hono } from 'hono';
import type { Router } from '@superfunctions/http';
import { interfaceApps, type InterfaceApp } from '@nucleum/schema/interfaces';
import { createInterfaceApiRouter, type InterfaceApiServices } from './router.js';
import { ApiProblem } from './problem.js';

export interface RegisterInterfaceApiRoutesInput {
  app: Hono;
  services: InterfaceApiServices;
}

/**
 * Serves each app's versioned REST API under `/v1/<app>`. A path no route
 * matches gets a 404 problem, or a 405 when another method serves it, and
 * a path that does not decode gets a 400 problem.
 */
export function registerInterfaceApiRoutes(input: RegisterInterfaceApiRoutesInput): void {
  const routers = new Map<string, Router>(
    interfaceApps.map((name: InterfaceApp) => [name, createInterfaceApiRouter(name, input.services)])
  );
  const handle = (request: Request, appName: string): Promise<Response> | Response => {
    const router = routers.get(appName);
    const path = new URL(request.url).pathname;
    if (!isDecodablePath(path)) {
      return new ApiProblem(400, 'invalid_path', 'The path holds an invalid percent-encoded sequence.').toResponse();
    }
    if (router?.match(request.method, path)) return router.handle(request);
    const methods = router
      ? ['GET', 'POST', 'PATCH'].filter((method) => router.match(method, path))
      : [];
    if (methods.length > 0) {
      return new ApiProblem(405, 'method_not_allowed', `Use ${methods.join(' or ')} for this path.`, {}, {
        allow: methods.join(', ')
      }).toResponse();
    }
    return new ApiProblem(404, 'not_found', 'No API route matches this path.').toResponse();
  };
  input.app.all('/v1/:app', (c) => handle(c.req.raw, c.req.param('app')));
  input.app.all('/v1/:app/*', (c) => handle(c.req.raw, c.req.param('app')));
}

/** Whether every path segment percent-decodes, as route matching needs. */
function isDecodablePath(path: string): boolean {
  try {
    for (const segment of path.split('/')) decodeURIComponent(segment);
    return true;
  } catch {
    return false;
  }
}
