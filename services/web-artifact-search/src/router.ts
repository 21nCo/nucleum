import { Hono } from "hono";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import { cors } from "hono/cors";
import type { AppBindings } from "./types";
import searchRoute from "./routes/search";

const app = new Hono<AppBindings>();

app.use("*", logger());
app.use("*", timing());
app.use("*", cors());

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/api/web-artifacts", searchRoute);

export default app;
