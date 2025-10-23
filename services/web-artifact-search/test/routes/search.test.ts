import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../src/middleware/auth", () => ({
  requireAuth: (_c: any, next: any) => next()
}));

import app from "../../src/router";
import { webArtifactRepository } from "../../src/repositories/webArtifact.repository";

const ORIGINAL_ENV = { ...process.env };

describe("/api/web-artifacts/search route", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("validates query params", async () => {
    const response = await app.request("/api/web-artifacts/search?query=test", {
      headers: {
        Authorization: "Bearer token"
      }
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("INVALID_PARAMETERS");
  });

  it("returns data from repository", async () => {
    const mockResult = {
      items: [
        {
          id: "tmdb:1",
          category: "MOVIES",
          title: "Mock Movie"
        }
      ],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false
    };

    const spy = vi
      .spyOn(webArtifactRepository, "search")
      .mockResolvedValue(mockResult as any);

    const response = await app.request(
      "/api/web-artifacts/search?category=MOVIES&query=inception",
      {
        headers: {
          Authorization: "Bearer token"
        }
      }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(mockResult);
    expect(spy).toHaveBeenCalledWith({
      category: "MOVIES",
      query: "inception",
      page: 1,
      limit: 10
    });
  });
});
