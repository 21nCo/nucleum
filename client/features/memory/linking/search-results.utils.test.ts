import { describe, expect, it } from "vitest";
import { highlightSearchQuery } from "@nucleum/features/memory/linking/search-results.utils";

describe("client/features/memory/linking/search-results.utils", () => {
  it("highlights queries containing regular expression metacharacters literally", () => {
    const [result] = highlightSearchQuery(
      [{ label: "Notes [draft] (v1.2)", text: "See [draft] for a.b details" }],
      "[draft]"
    );

    expect(result.labelSearch).toBe("Notes **[draft]** (v1.2)");
    expect(result.bodySearch).toBe("See **[draft]** for a.b details");
  });

  it("does not treat a dot in the query as a wildcard", () => {
    const [result] = highlightSearchQuery(
      [{ label: "a.b and axb", text: "" }],
      "a.b"
    );

    expect(result.labelSearch).toBe("**a.b** and axb");
  });
});
