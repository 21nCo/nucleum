import { Hono } from "hono";
import type { AppBindings, WebArtifactSearchQuery } from "../types";
import { WebArtifactSearchQuerySchema } from "../types";
import { webArtifactRepository } from "../repositories/webArtifact.repository";
import { requireAuth } from "../middleware/auth";

const searchRoute = new Hono<AppBindings>();

searchRoute.use("/*", requireAuth);

searchRoute.get("/search", async (c) => {
  const rawParams = {
    category: c.req.query("category")?.toUpperCase(),
    query: c.req.query("query") ?? undefined,
    page: c.req.query("page") ?? undefined,
    limit: c.req.query("limit") ?? undefined
  };

  const parsed = WebArtifactSearchQuerySchema.safeParse(rawParams);
  if (!parsed.success) {
    return c.json(
      {
        error: "INVALID_PARAMETERS",
        details: parsed.error.flatten()
      },
      400
    );
  }

  const params: WebArtifactSearchQuery = parsed.data;

  const result = await webArtifactRepository.search(params);

  return c.json({
    data: result,
    category: params.category,
    query: params.query,
    fetchedAt: new Date().toISOString()
  });
});

export default searchRoute;
