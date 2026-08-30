import type { Hono } from "hono";
import type { SyncServer } from "./server.js";

export interface RegisterAccountDatafnRoutesInput {
  app: Hono;
  getSyncServer: () => Promise<SyncServer>;
}

/** Registers account DataFn HTTP routes. */
export function registerAccountDatafnRoutes(
  input: RegisterAccountDatafnRoutesInput
): void {
  const { app, getSyncServer } = input;
  app.all("/datafn/*", async (c) => {
    const server = await getSyncServer();
    return server.router.handle(c.req.raw);
  });
}
