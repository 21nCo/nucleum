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

  it("matches the label's own closing bracket", () => {
    const mention = renderIntoDom(
      renderMdAsHtml("[How to call f[0](x)](resource=node_f)")
    ).querySelector(".inline-mention");
    expect(mention?.getAttribute("data-record-id")).toBe("node_f");
    expect(mention?.getAttribute("data-label")).toBe("How to call f[0](x)");
    const container = renderIntoDom(
      renderMdAsHtml("[note](see below) then [doc](https://x.com)")
    );
    expect(container.querySelectorAll(".inline-link")).toHaveLength(1);
    expect(container.querySelector(".inline-link")?.textContent).toBe("doc");
  });

  it("renders mentions and links whose labels have unbalanced brackets", () => {
    const cases: [string, string, string][] = [
      ["See [Happy :]](resource=node_2) today", ".inline-mention", "Happy :]"],
      ["See [Q4 plan [draft](resource=node_1) today", ".inline-mention", "Q4 plan [draft"],
      ["Read [Part 2]](https://x.com/p2)", ".inline-link", "Part 2]"],
      ["[Phase ] 2](resource=node_3)", ".inline-mention", "Phase ] 2"],
      ["[Phase ] [draft] status](resource=node_4)", ".inline-mention", "Phase ] [draft] status"]
    ];
    for (const [text, selector, label] of cases) {
      const element = renderIntoDom(renderMdAsHtml(text)).querySelector(selector);
      expect(element?.getAttribute("data-label"), text).toBe(label);
    }
    for (const newline of ["\n", "\r\n"]) {
      const runLink = renderIntoDom(
        renderMdAsHtml(`[Draft]${newline}Read [Part 2]](https://example.com/docs)`)
      ).querySelectorAll(".inline-link");
      expect(runLink).toHaveLength(1);
      expect(runLink[0].textContent).toBe("Part 2]");
      const stray = renderIntoDom(
        renderMdAsHtml(`Syntax starts with [${newline}Read [Docs](https://example.com/docs).`)
      );
      expect(stray.querySelector(".inline-link")?.textContent).toBe("Docs");
      expect(stray.textContent).toContain("Syntax starts with [");
    }
    const task = renderIntoDom(renderMdAsHtml("- [x] Read [spec](https://x.com/spec)"));
    expect(task.querySelector(".inline-link")?.textContent).toBe("spec");
  });

  it("ignores brackets in inline code and escaped brackets when pairing labels", () => {
    for (const text of [
      "[Release notes\nfor `arr[0`](https://example.com/docs)",
      "[Release notes\nfor \\[draft](https://example.com/docs)"
    ]) {
      const link = renderIntoDom(renderMdAsHtml(text)).querySelector(".inline-link");
      expect(link?.getAttribute("data-href"), text).toBe("example.com/docs".replace(/^/, "https://"));
      expect(link?.textContent?.startsWith("Release notes"), text).toBe(true);
    }
  });

  it("never opens a label at a bracket inside code or after a backslash", () => {
    const cases: [string, string, string][] = [
      ["Use `a[0]` and [doc](https://x.com)", ".inline-link", "doc"],
      ["Call `list[i]` then see [Bob](resource=p1)", ".inline-mention", "Bob"],
      ["`[` opens a [link](https://x.com)", ".inline-link", "link"],
      ["[Release notes\nfor ``arr[0``](https://x.com/docs)", ".inline-link", "Release notes<br>for ``arr[0``"],
      ["See [Q4 plan [draft](resource=node_1) \\\n## Title ]", ".inline-mention", "Q4 plan [draft"]
    ];
    for (const [text, selector, label] of cases) {
      const element = renderIntoDom(renderMdAsHtml(text)).querySelector(selector);
      expect(element?.getAttribute("data-label"), text).toBe(label);
    }
    const code = renderIntoDom(renderMdAsHtml("Use `a[0]` and [doc](https://x.com)"));
    expect(code.textContent).toContain("a[0]");
  });

  it("treats an escaped backslash before a bracket as literal", () => {
    expect(
      renderIntoDom(renderMdAsHtml("\\\\[Docs](https://example.com)"))
        .querySelector(".inline-link")?.textContent
    ).toBe("Docs");
    expect(
      renderIntoDom(renderMdAsHtml("\\\\\\[Docs](https://example.com)"))
        .querySelector(".inline-link")
    ).toBeNull();
  });

  it("does not let a lone backtick hide later brackets", () => {
    const link = renderIntoDom(
      renderMdAsHtml("don`t miss [skip](https://example.com/docs)")
    ).querySelector(".inline-link");
    expect(link?.textContent).toBe("skip");
  });

  it("checks block boundaries against whole source lines", () => {
    for (const text of [
      "[Release notes\n---](https://example.com/docs)",
      "[Release notes\n](https://example.com/docs)"
    ]) {
      expect(
        renderIntoDom(renderMdAsHtml(text))
          .querySelector(".inline-link")
          ?.getAttribute("data-href")
      ).toBe("https://example.com/docs");
    }
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
