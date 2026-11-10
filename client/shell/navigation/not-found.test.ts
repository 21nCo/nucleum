import { describe, expect, it } from "vitest";
import { isNotFoundPath, resolveNotFound, trimSlashes } from "./not-found";

const origin = "https://local.nucleum.app";

/**
 * Replays what the page painter does after every navigation: resolve the URL
 * path, and when no page matches, follow the not-found decision. Stops when a
 * page resolves or the not-found page renders in place.
 */
function settle(startPath: string, pages: Set<string>, maxSteps = 20) {
  let url = new URL(startPath, origin);
  const navigations: string[] = [];
  for (let step = 0; step < maxSteps; step++) {
    const path = trimSlashes(url.pathname);
    if (pages.has(path)) return { url, navigations, state: "page" as const };
    const result = resolveNotFound(path, { isUrlPath: true, currentUrl: url });
    if (result.kind === "inline") {
      return { url, navigations, state: "not-found" as const };
    }
    navigations.push(result.url);
    url = new URL(result.url, origin);
  }
  return { url, navigations, state: "looping" as const };
}

describe("resolveNotFound", () => {
  it("redirects an unknown path once and keeps the original path", () => {
    const result = settle("/does-not-exist", new Set(["calendar", "404"]));
    expect(result.state).toBe("page");
    expect(result.navigations).toEqual(["/404?path=does-not-exist"]);
    expect(result.url.pathname + result.url.search).toBe(
      "/404?path=does-not-exist"
    );
  });

  it("does not loop when the not-found page itself is not registered", () => {
    const result = settle("/does-not-exist", new Set(["calendar"]));
    expect(result.state).toBe("not-found");
    expect(result.navigations).toEqual(["/404?path=does-not-exist"]);
  });

  it("never wraps the not-found route in another redirect", () => {
    const result = settle("/404", new Set(["calendar"]));
    expect(result.state).toBe("not-found");
    expect(result.navigations).toEqual([]);
    expect(
      resolveNotFound("404", {
        isUrlPath: true,
        currentUrl: new URL("/404?path=foo", origin)
      })
    ).toEqual({ kind: "inline" });
  });

  it("keeps nested unknown paths whole", () => {
    const result = settle("/a/b/c/", new Set(["calendar"]));
    expect(result.navigations).toEqual(["/404?path=a%2Fb%2Fc"]);
  });

  it("renders command and sheet pages in place instead of redirecting", () => {
    expect(
      resolveNotFound("unknown-command", {
        isUrlPath: false,
        currentUrl: new URL("/calendar", origin)
      })
    ).toEqual({ kind: "inline" });
    expect(
      resolveNotFound(undefined, {
        isUrlPath: false,
        currentUrl: new URL("/calendar", origin)
      })
    ).toEqual({ kind: "inline" });
  });

  it("does not redirect to the URL it is already on", () => {
    expect(
      resolveNotFound("prefix/404", {
        isUrlPath: true,
        currentUrl: new URL("/404?path=prefix%2F404", origin)
      })
    ).toEqual({ kind: "inline" });
  });
});

describe("resolveNotFound in the native app", () => {
  it("redirects on a custom-scheme origin", () => {
    expect(
      resolveNotFound("unknown-route", {
        isUrlPath: true,
        currentUrl: new URL("tauri://localhost/unknown-route")
      })
    ).toEqual({ kind: "redirect", url: "/404?path=unknown-route" });
  });
});

describe("isNotFoundPath", () => {
  it("matches the not-found route with or without slashes", () => {
    expect(isNotFoundPath("404")).toBe(true);
    expect(isNotFoundPath("/404/")).toBe(true);
    expect(isNotFoundPath("404x")).toBe(false);
    expect(isNotFoundPath("calendar")).toBe(false);
  });
});

describe("trimSlashes", () => {
  it("removes leading and trailing slashes only", () => {
    expect(trimSlashes("//a/b//")).toBe("a/b");
    expect(trimSlashes("///")).toBe("");
    expect(trimSlashes(undefined)).toBe("");
    expect(trimSlashes(`${"/".repeat(100000)}x`)).toBe("x");
  });
});
