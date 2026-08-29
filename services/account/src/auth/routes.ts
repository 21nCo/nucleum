import type { Hono } from "hono";
import type { AuthFnServer } from "authfn";

export interface RegisterAccountAuthRoutesInput {
  app: Hono;
  auth: AuthFnServer;
}

/** Registers account AuthFn HTTP routes. */
export function registerAccountAuthRoutes(
  input: RegisterAccountAuthRoutesInput
): void {
  input.app.all("/auth/*", async (c) => input.auth.router.handle(c.req.raw));
}
