import type { Hono } from "hono";

/**
 * Introspection surface backing the `/__test/*` routes. Implemented by the test
 * harness so end-to-end tests can inspect captured outbox messages and events
 * and reset in-memory state between cases.
 */
export interface AccountTestControlSurface {
  getOutboxMessages(): unknown[];
  getEvents(): unknown[];
  reset(): Promise<void> | void;
}

/**
 * Registers the test-only `/__test/*` routes onto an existing account app.
 * This lives in `testing/` and is imported only by the harness so production
 * builds never wire these endpoints.
 */
export function registerTestRoutes(
  app: Hono,
  control: AccountTestControlSurface | undefined
): void {
  app.get("/__test/outbox/latest", (c) => {
    const identifier = c.req.query("identifier")?.trim().toLowerCase();
    const messages = control?.getOutboxMessages() ?? [];
    const matched = identifier
      ? messages.filter((message) => {
          const record = message as {
            email?: unknown;
            to?: unknown;
            identifier?: unknown;
          };
          const value =
            typeof record.email === "string"
              ? record.email
              : typeof record.to === "string"
                ? record.to
                : typeof record.identifier === "string"
                  ? record.identifier
                  : undefined;
          return value?.trim().toLowerCase() === identifier;
        })
      : messages;

    return c.json({
      ok: true,
      message: matched.at(-1) ?? null
    });
  });

  app.get("/__test/events", (c) =>
    c.json({
      ok: true,
      events: control?.getEvents() ?? []
    })
  );

  app.post("/__test/reset", async (c) => {
    await control?.reset();
    return c.json({
      ok: true
    });
  });
}
