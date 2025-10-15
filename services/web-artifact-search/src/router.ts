import { Hono } from "hono";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { AppBindings } from "./types";
import searchRoute from "./routes/search";

const app = new Hono<AppBindings>();

app.use("*", logger());
app.use("*", timing());
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") ?? ["https://memotron.app"],
    credentials: true,
    allowMethods: ["GET", "OPTIONS"]
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/web-artifacts", searchRoute);

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json(
    {
      error: "INTERNAL_ERROR",
      message: err.message || "An unexpected error occurred"
    },
    err instanceof HTTPException ? err.status : 500
  );
});

export default app;
