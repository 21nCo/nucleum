import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./router";

const port = Number(process.env.PORT ?? 8787);

serve({
  fetch: app.fetch,
  port
});

console.log(`web-artifact-search service listening on http://localhost:${port}`);
