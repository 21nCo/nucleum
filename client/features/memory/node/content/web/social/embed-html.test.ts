import { describe, expect, it } from "vitest";

import {
  escapeHtmlAttribute,
  resolveEmbedFrameUrl,
  sanitizeEmbedHtml
} from "@nucleum/features/memory/node/content/web/social/embed-html";

function render(html: string) {
  const container = document.createElement("div");
  container.innerHTML = sanitizeEmbedHtml(html);
  return container;
}

describe("sanitizeEmbedHtml", () => {
  it("removes event handlers and scripts from oEmbed HTML", () => {
    const container = render(
      '<blockquote class="mastodon-embed"><p>Hi</p><img src=x onerror="alert(document.domain)"><script>alert(1)</script></blockquote>'
    );
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
    expect(container.querySelector("blockquote p")?.textContent).toBe("Hi");
  });

  it("drops javascript: links and frames, and opens http links in a new tab", () => {
    const container = render(
      '<a href="javascript:alert(1)">bad</a><a href="https://example.com/post">ok</a><iframe src="javascript:alert(1)"></iframe>'
    );
    const [bad, ok] = Array.from(container.querySelectorAll("a"));
    expect(bad.getAttribute("href")).toBeNull();
    expect(ok.getAttribute("href")).toBe("https://example.com/post");
    expect(ok.getAttribute("target")).toBe("_blank");
    expect(ok.getAttribute("rel")).toBe("noopener noreferrer");
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("keeps https frames from other origins sandboxed and drops same-origin or srcdoc frames", () => {
    const container = render(
      [
        '<iframe src="https://embed.bsky.app/embed/a/app.bsky.feed.post/1"></iframe>',
        `<iframe src="${window.location.origin}/settings"></iframe>`,
        '<iframe srcdoc="<script>alert(1)</script>"></iframe>'
      ].join("")
    );
    const frames = Array.from(container.querySelectorAll("iframe"));
    expect(frames).toHaveLength(1);
    expect(frames[0].getAttribute("src")).toBe(
      "https://embed.bsky.app/embed/a/app.bsky.feed.post/1"
    );
    expect(frames[0].getAttribute("sandbox")).toContain("allow-scripts");
    expect(frames[0].hasAttribute("srcdoc")).toBe(false);
  });

  it("neutralises attribute injection through a crafted post URL", () => {
    const postUrl = 'https://evil.example/@a/1" onload="alert(1)';
    const container = render(`<iframe src="${postUrl}/embed"></iframe>`);
    expect(container.querySelector("[onload]")).toBeNull();
  });

  it("keeps plain presentation attributes such as frame size", () => {
    const container = render(
      '<iframe src="https://embed.bsky.app/embed/a/app.bsky.feed.post/1" width="400" height="600" frameborder="0"></iframe><img src="https://cdn.example.com/a.png" width="20" alt="a"><time datetime="2026-01-01">x</time>'
    );
    const frame = container.querySelector("iframe");
    expect(frame?.getAttribute("width")).toBe("400");
    expect(frame?.getAttribute("height")).toBe("600");
    expect(container.querySelector("img")?.getAttribute("width")).toBe("20");
    expect(container.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-01-01"
    );
  });

  it("removes inline styles that could position content over the app", () => {
    const container = render(
      '<a href="https://evil.example/login" style="position:fixed;inset:0;z-index:2147483647">x</a><p style="background:url(https://evil.example/t.png)">y</p>'
    );
    expect(container.querySelector("[style]")).toBeNull();
  });

  it("removes relative and non-http URLs from every URL attribute", () => {
    const container = render(
      '<svg><a xlink:href="/settings"><text>x</text></a></svg><video poster="/private.png" src="https://cdn.example.com/v.mp4"></video><blockquote cite="javascript:alert(1)">q</blockquote><img src="https://cdn.example.com/a.png" srcset="/a.png 1x">'
    );
    expect(container.querySelector("[poster]")).toBeNull();
    expect(container.querySelector("[cite]")).toBeNull();
    expect(container.querySelector("[srcset]")).toBeNull();
    expect(container.innerHTML).not.toContain("/settings");
    expect(container.querySelector("video")?.getAttribute("src")).toBe(
      "https://cdn.example.com/v.mp4"
    );
  });

  it("opens SVG links in a new tab and applies the element style to frames", () => {
    const container = document.createElement("div");
    container.innerHTML = sanitizeEmbedHtml(
      '<svg><a xlink:href="https://example.com/x"><text>x</text></a></svg><iframe src="https://embed.example.com/p" style="border:0"></iframe>',
      { elementStyle: "width: 80%" }
    );
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(container.querySelector("iframe")?.getAttribute("style")).toContain("width: 80%");
  });

  it("applies a caller-provided element style instead of embed styles", () => {
    const container = document.createElement("div");
    container.innerHTML = sanitizeEmbedHtml(
      '<p style="position:fixed;inset:0">post</p>',
      { elementStyle: "width: 80%" }
    );
    expect(container.querySelector("p")?.getAttribute("style")).toBe("width: 80%");
  });

  it("returns an empty string for non-string input", () => {
    expect(sanitizeEmbedHtml(undefined)).toBe("");
    expect(sanitizeEmbedHtml({ html: "<b>x</b>" })).toBe("");
  });
});

describe("resolveEmbedFrameUrl", () => {
  it("accepts only https URLs on another origin", () => {
    expect(resolveEmbedFrameUrl("https://example.com/a")).toBe(
      "https://example.com/a"
    );
    expect(resolveEmbedFrameUrl("http://example.com/a")).toBeNull();
    expect(resolveEmbedFrameUrl("javascript:alert(1)")).toBeNull();
    expect(resolveEmbedFrameUrl("/relative")).toBeNull();
    expect(resolveEmbedFrameUrl(`${window.location.origin}/x`)).toBeNull();
  });
});

describe("escapeHtmlAttribute", () => {
  it("escapes quotes and angle brackets for built embed snippets", () => {
    expect(
      escapeHtmlAttribute('https://x.example/p" onload="alert(1)<')
    ).toBe("https://x.example/p&quot; onload=&quot;alert(1)&lt;");
  });
});
