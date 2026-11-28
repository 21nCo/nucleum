import { render } from "@testing-library/svelte";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { afterEach, describe, expect, it } from "vitest";

import type { INode } from "@nucleum/features/memory/node/node.type";
import NodeThumbnailWebLink from "./NodeThumbnailWebLink.svelte";

function webLink(url: string): INode {
  return { id: "node:test-web-link", contentType: NodeType.LINK, url } as unknown as INode;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("NodeThumbnailWebLink", () => {
  it("does not render a javascript: URL as a link", () => {
    const { container } = render(NodeThumbnailWebLink, {
      props: { item: webLink("javascript:alert(document.domain)//example.com") }
    });
    expect(container.querySelector("a")).toBeNull();
  });

  it("links an https URL and shows its domain", () => {
    const { container } = render(NodeThumbnailWebLink, {
      props: { item: webLink("https://example.com/article") }
    });
    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("https://example.com/article");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor?.textContent?.trim()).toBe("example.com");
  });

  it("adds https to a URL saved without a scheme", () => {
    const { container } = render(NodeThumbnailWebLink, {
      props: { item: webLink("example.com/article") }
    });
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com/article");
  });
});
