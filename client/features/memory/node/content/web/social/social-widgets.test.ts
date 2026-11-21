import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import {
  MAX_CAPTURED_MEDIA,
  hasLiveSocialWidget,
  resolveCapturedMediaUrls,
  resolveCopyablePostText
} from "@nucleum/features/memory/node/content/web/social/social-widgets";

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

describe("resolveCapturedMediaUrls", () => {
  it("keeps https images the clipper saved, without duplicates", () => {
    expect(
      resolveCapturedMediaUrls(NodeType.MASTODON_POST, {
        media: [
          "https://files.mastodon.social/media/a.png",
          " https://files.mastodon.social/media/a.png ",
          "http://files.mastodon.social/media/b.png",
          "javascript:alert(1)",
          "https://user:pass@files.example/c.png",
          "/relative.png",
          42
        ]
      })
    ).toEqual(["https://files.mastodon.social/media/a.png"]);
  });

  it("caps the number of images and ignores missing media", () => {
    const media = Array.from(
      { length: MAX_CAPTURED_MEDIA + 2 },
      (_, index) => `https://files.example/${index}.png`
    );
    expect(resolveCapturedMediaUrls(NodeType.MASTODON_POST, { media })).toHaveLength(
      MAX_CAPTURED_MEDIA
    );
    expect(resolveCapturedMediaUrls(NodeType.MASTODON_POST, undefined)).toEqual([]);
    expect(
      resolveCapturedMediaUrls(NodeType.MASTODON_POST, { media: "https://files.example/a.png" })
    ).toEqual([]);
  });

  it("shows no gallery for clippers that also store videos in media", () => {
    const metadata = { media: ["https://video.example/clip.mp4"] };
    expect(resolveCapturedMediaUrls(NodeType.FACEBOOK_POST, metadata)).toEqual([]);
    expect(resolveCapturedMediaUrls(NodeType.INSTAGRAM_REEL, metadata)).toEqual([]);
  });
});

describe("resolveCopyablePostText", () => {
  it("copies captured post text, never the URL-derived label", () => {
    expect(
      resolveCopyablePostText({ contentType: NodeType.MASTODON_POST, text: "Hello" })
    ).toBe("Hello");
    expect(
      resolveCopyablePostText({ contentType: NodeType.MASTODON_POST, text: "  " })
    ).toBe("");
    expect(
      resolveCopyablePostText({
        contentType: NodeType.TWEET,
        body: { content: "Tweet body" }
      })
    ).toBe("Tweet body");
  });
});
