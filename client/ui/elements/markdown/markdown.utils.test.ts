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

describe("renderMdAsHtml links and quotes", () => {
  it("keeps link destinations exact, including arrows and underscores", () => {
    const container = renderIntoDom(
      renderMdAsHtml("[docs](https://example.com/a__b?q=a->b)")
    );
    const link = container.querySelector(".inline-link");
    expect(link?.getAttribute("data-href")).toBe(
      "https://example.com/a__b?q=a->b"
    );
    expect(link?.textContent).toBe("docs");
  });

  it("does not let a link pattern match across generated mention markup", () => {
    for (const text of [
      '# [x](resource=[y](https://z" onmouseover="alert(1)))',
      "> [x](resource=[y](https://z onmouseover=alert(1)))",
      "[a](resource=[b](https://c) [d](https://e))"
    ]) {
      const container = renderIntoDom(renderMdAsHtml(text));
      expect(container.querySelector("[onmouseover]")).toBeNull();
      for (const element of Array.from(container.querySelectorAll("*"))) {
        for (const attribute of Array.from(element.attributes)) {
          expect([
            "class",
            "data-record-id",
            "data-label",
            "data-href"
          ]).toContain(attribute.name);
        }
      }
    }
  });

  it("renders a quote only for a literal greater-than marker", () => {
    expect(
      renderIntoDom(renderMdAsHtml("> quoted")).querySelector("blockquote")
        ?.textContent
    ).toBe("quoted");
    const escaped = renderIntoDom(renderMdAsHtml("&gt; 5 requests per second"));
    expect(escaped.querySelector("blockquote")).toBeNull();
    expect(escaped.textContent).toBe("> 5 requests per second");
  });

  it("keeps dollar signs in link labels and destinations literal", () => {
    const container = renderIntoDom(
      renderMdAsHtml("[Price $2 $$5 $<100](https://x.com/?q=$&r=1&c=$$)")
    );
    const link = container.querySelector(".inline-link");
    expect(link?.getAttribute("data-href")).toBe("https://x.com/?q=$&r=1&c=$$");
    expect(link?.textContent).toBe("Price $2 $$5 $<100");
    const mention = renderIntoDom(
      renderMdAsHtml("[a $` b](resource=r1)")
    ).querySelector(".inline-mention");
    expect(mention?.getAttribute("data-record-id")).toBe("r1");
    expect(mention?.getAttribute("data-label")).toBe("a $` b");
  });

  it("keeps brackets inside link and mention labels", () => {
    const link = renderIntoDom(
      renderMdAsHtml("[Docs [API]](https://example.com/docs)")
    ).querySelector(".inline-link");
    expect(link?.getAttribute("data-href")).toBe("https://example.com/docs");
    expect(link?.textContent).toBe("Docs [API]");
    const mention = renderIntoDom(
      renderMdAsHtml("[Roadmap [Q4]](resource=node_q4)")
    ).querySelector(".inline-mention");
    expect(mention?.getAttribute("data-record-id")).toBe("node_q4");
  });

  it("never leaks the internal quote marker", () => {
    for (const text of ["[a\n> b](https://x.com)", "> [q](https://x.com)", "x\n> y"]) {
      const html = renderMdAsHtml(text);
      expect(html).not.toContain("\uFFF2");
      expect(renderIntoDom(html).querySelector("blockquote")).not.toBeNull();
    }
  });

  it("does not let a link or mention span a block boundary", () => {
    for (const newline of ["\n", "\r\n"]) {
      const container = renderIntoDom(
        renderMdAsHtml(
          ["See [doc](https://example.com/doc)", "## Summary", "[Plan](resource=node_1)"].join(newline)
        )
      );
      expect(container.querySelector(".inline-link")?.getAttribute("data-href")).toBe(
        "https://example.com/doc"
      );
      expect(container.querySelector("h2")?.textContent?.trim()).toBe("Summary");
      expect(container.querySelector(".inline-mention")?.getAttribute("data-label")).toBe(
        "Plan"
      );
    }
  });

  it("renders a link and a mention on consecutive lines separately", () => {
    for (const newline of ["\n", "\r\n"]) {
      const container = renderIntoDom(
        renderMdAsHtml(
          `[Docs](https://example.com/docs)${newline}[Roadmap](resource=node_1)`
        )
      );
      expect(container.querySelector(".inline-link")?.getAttribute("data-href")).toBe(
        "https://example.com/docs"
      );
      expect(container.querySelector(".inline-mention")?.getAttribute("data-label")).toBe(
        "Roadmap"
      );
    }
  });

  it("treats only a whole rule line as a block boundary", () => {
    const link = renderIntoDom(
      renderMdAsHtml("[Release notes\n---draft](https://example.com/notes)")
    ).querySelector(".inline-link");
    expect(link?.getAttribute("data-href")).toBe("https://example.com/notes");
  });

  it("renders a link whose label spans lines", () => {
    const container = renderIntoDom(
      renderMdAsHtml("[first\nsecond](https://example.com/a)")
    );
    const link = container.querySelector(".inline-link");
    expect(link?.getAttribute("data-href")).toBe("https://example.com/a");
    expect(link?.querySelector("br")).not.toBeNull();
  });

  it("keeps mentions rendering with their record id", () => {
    const container = renderIntoDom(renderMdAsHtml("See [Plan](resource=node_1)"));
    const mention = container.querySelector(".inline-mention");
    expect(mention?.getAttribute("data-record-id")).toBe("node_1");
    expect(mention?.getAttribute("data-label")).toBe("Plan");
  });
});

describe("escapeHtmlKeepingEntities", () => {
  it("escapes HTML delimiters and bare ampersands but keeps character references", () => {
    expect(escapeHtmlKeepingEntities(`<a href="x">'&'</a> &lt; &#60; &#x3C;`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt; &lt; &#60; &#x3C;"
    );
  });
});
