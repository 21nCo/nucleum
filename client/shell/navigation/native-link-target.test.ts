import { describe, expect, it } from "vitest";
import { resolveNavigationLinkTarget } from "./link-target";

describe.each(["tauri://localhost", "null"])("navigation from %s", (origin) => {
  it.each(["/library", "#section", "./notes", "?q=hello"])(
    "keeps %s inside the app",
    (url) => {
      expect(resolveNavigationLinkTarget(url, origin)).toEqual({
        kind: "internal",
        url
      });
    }
  );

  it.each(["https://example.com/path", "//example.com/path"])(
    "keeps %s external",
    (url) => {
      expect(resolveNavigationLinkTarget(url, origin)).toEqual({
        kind: "external",
        url: "https://example.com/path"
      });
    }
  );

  it.each([
    "javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,test"
  ])("rejects unsafe scheme %s", (url) => {
    expect(resolveNavigationLinkTarget(url, origin)).toBeUndefined();
  });
});
