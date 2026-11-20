import { describe, expect, it } from "vitest";

import {
  escapeHtmlKeepingEntities,
  escapeMarkdownText,
  renderMdAsHtml
} from "./markdown.utils";

const payload = 'Quarterly report <img src=x onerror="alert(document.domain)">';

function renderIntoDom(html: string) {
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("renderMdAsHtml", () => {
  it("renders raw HTML in user text as literal text", () => {
    const container = renderIntoDom(renderMdAsHtml(payload));
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });

  it("escapes markup inside headings, quotes, lists and links", () => {
    const text = [
      "# <script>alert(1)</script>",
      "> <svg onload=alert(1)>",
      "- <iframe src=javascript:alert(1)>",
      '[x" onmouseover="alert(1)](https://example.com/a" onclick="alert(1))'
    ].join("\n");
    const container = renderIntoDom(renderMdAsHtml(text, { isPageRender: true }));
    expect(container.querySelector("script, svg, iframe")).toBeNull();
    expect(container.querySelector("[onmouseover], [onclick]")).toBeNull();
    expect(container.querySelector("h1")?.textContent).toBe(
      "<script>alert(1)</script>"
    );
    expect(container.querySelector("blockquote")?.textContent).toBe(
      "<svg onload=alert(1)>"
    );
  });

  it("does not double-escape text that callers already escaped", () => {
    const container = renderIntoDom(
      renderMdAsHtml(`Deleted ${escapeMarkdownText("<b>notes</b> & *more*")}`)
    );
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toBe("Deleted <b>notes</b> & *more*");
    expect(renderMdAsHtml("Tom &amp; Jerry")).toBe("Tom &amp; Jerry");
  });

  it("keeps the established inline Markdown and symbol rendering", () => {
    const container = renderIntoDom(
      renderMdAsHtml("**bold** and *italic* -> `code` a < b & c")
    );
    expect(container.querySelector("b")?.textContent).toBe("bold");
    expect(container.querySelector("i")?.textContent).toBe("italic");
    expect(container.textContent).toContain("→");
    expect(container.textContent).toContain("a < b & c");
  });
});

describe("escapeHtmlKeepingEntities", () => {
  it("escapes HTML delimiters and bare ampersands but keeps character references", () => {
    expect(escapeHtmlKeepingEntities(`<a href="x">'&'</a> &lt; &#60; &#x3C;`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt; &lt; &#60; &#x3C;"
    );
  });
});
