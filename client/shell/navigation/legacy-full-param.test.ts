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

  it("drops a stray full mode timestamp", () => {
    expect(rewrite("?page=node%3A1&fullAt=5")).toEqual({ page: "node:1" });
  });

  it("leaves other URLs unchanged", () => {
    expect(rewrite("?page=node%3A1&max=true")).toBeUndefined();
  });
});
