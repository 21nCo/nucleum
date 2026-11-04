import { describe, expect, it } from "vitest";
import {
  resolveLegacyFullParamPath,
  resolveLegacyFullParamUrl
} from "./legacy-full-param";

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

describe("resolveLegacyFullParamPath", () => {
  it("returns the rewritten in-app path", () => {
    expect(
      resolveLegacyFullParamPath(
        new URL("https://app.test/library?full=node%3A1#top")
      )
    ).toBe("/library?page=node%3A1&max=true#top");
  });

  it("keeps a path with repeated leading slashes on this origin", () => {
    const path = resolveLegacyFullParamPath(
      new URL("https://app.test//other.example/?full=x&q=http")
    );
    expect(path).toBe("/other.example/?q=http&overlay=x&max=true");
    expect(new URL(path!, "https://app.test").origin).toBe("https://app.test");
  });

  it("leaves other URLs unchanged", () => {
    expect(
      resolveLegacyFullParamPath(
        new URL("https://app.test/library?page=node%3A1")
      )
    ).toBeUndefined();
  });
});
