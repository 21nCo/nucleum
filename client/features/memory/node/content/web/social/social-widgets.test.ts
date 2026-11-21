import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import { hasLiveSocialWidget } from "@nucleum/features/memory/node/content/web/social/social-widgets";

describe("hasLiveSocialWidget", () => {
  it("never renders Mastodon posts with the provider widget", () => {
    // Mastodon's embed page needs allow-same-origin, and its embed.js re-adds
    // that flag to frames in the app document, so the app copy is shown.
    expect(hasLiveSocialWidget(NodeType.MASTODON_POST)).toBe(false);
    expect(hasLiveSocialWidget(NodeType.MASTODON_POST, true)).toBe(false);
  });

  it("keeps the other live widgets, with fewer inside embeds", () => {
    expect(hasLiveSocialWidget(NodeType.BLUESKY_POST)).toBe(true);
    expect(hasLiveSocialWidget(NodeType.REDDIT_POST)).toBe(true);
    expect(hasLiveSocialWidget(NodeType.REDDIT_POST, true)).toBe(false);
    expect(hasLiveSocialWidget(undefined)).toBe(false);
  });

  it("loads no Mastodon provider script from the social widgets", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = readdirSync(directory).filter((name) =>
      /\.(svelte|ts)$/.test(name) && !name.endsWith(".test.ts")
    );
    for (const name of sources) {
      const source = readFileSync(join(directory, name), "utf8");
      expect(source, name).not.toMatch(/mastodon[^"'\s]*\/embed\.js|mastodon-embed/i);
    }
  });
});
