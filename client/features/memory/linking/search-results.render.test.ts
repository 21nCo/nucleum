import { describe, expect, it } from "vitest";

import { renderMdAsHtml } from "@21n/ui/elements/markdown/markdown.utils";
import { highlightSearchQuery } from "@nucleum/features/memory/linking/search-results.utils";

const payload = 'Quarterly report <img src=x onerror="alert(document.domain)">';

describe("search highlights rendered as Markdown HTML", () => {
  it("keeps the highlight while rendering markup in the label and body as text", () => {
    const [item] = highlightSearchQuery(
      [{ label: payload, text: `Body ${payload}` }],
      "report"
    );
    for (const value of [item.labelSearch, item.bodySearch]) {
      const container = document.createElement("div");
      container.innerHTML = renderMdAsHtml(value);
      expect(container.querySelector("img, [onerror]")).toBeNull();
      expect(container.querySelector("b")?.textContent).toBe("report");
      expect(container.textContent).toContain("<img src=x");
    }
  });
});
