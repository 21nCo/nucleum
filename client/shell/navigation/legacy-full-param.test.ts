import { describe, expect, it } from "vitest";
import { resolveLegacyFullParamUrl } from "./legacy-full-param";

function rewrite(search: string) {
  const next = resolveLegacyFullParamUrl(
    new URL(`https://app.test/library${search}`)
  );
  return next ? Object.fromEntries(next.searchParams) : undefined;
}

describe("resolveLegacyFullParamUrl", () => {
  it("opens a record from the full mode as the page in full screen", () => {
    expect(rewrite("?full=node%3A1&fullAt=5&selected=node%3A2")).toEqual({
      page: "node:1",
      max: "true",
      selected: "node:2"
    });
  });

  it("opens a full screen path as the overlay in full screen", () => {
    expect(rewrite("?full=focus")).toEqual({ overlay: "focus", max: "true" });
  });

  it("closes the page and its split under a full screen path", () => {
    expect(
      rewrite(
        "?page=objective%3A1&pageAt=2&besidePage=node%3A3&besidePageAt=4&full=FULL_SCREEN_FOCUS&selected=node%3A5"
      )
    ).toEqual({
      overlay: "FULL_SCREEN_FOCUS",
      max: "true",
      selected: "node:5"
    });
  });

  it("drops a stray full mode timestamp", () => {
    expect(rewrite("?page=node%3A1&fullAt=5")).toEqual({ page: "node:1" });
  });

  it("leaves other URLs unchanged", () => {
    expect(rewrite("?page=node%3A1&max=true")).toBeUndefined();
  });
});
