import { NodeType } from "@nucleum/schema/legacy/node-type.enum";

/**
 * Social posts rendered with the provider's live widget. Mastodon is not one:
 * its embed page renders only with `allow-same-origin`, and its `embed.js`
 * runs in the app document and re-adds that flag to embed frames, so Mastodon
 * posts use the app-rendered copy instead.
 */
const LIVE_WIDGET_TYPES: ReadonlySet<NodeType> = new Set([
  NodeType.TWEET,
  NodeType.INSTAGRAM_POST,
  NodeType.INSTAGRAM_REEL,
  NodeType.LINKEDIN_POST,
  NodeType.REDDIT_POST,
  NodeType.BLUESKY_POST,
  NodeType.THREADS_POST
]);

/** Live widgets that also render inside an embedded Nucleum view. */
const EMBED_LIVE_WIDGET_TYPES: ReadonlySet<NodeType> = new Set([
  NodeType.TWEET,
  NodeType.INSTAGRAM_POST,
  NodeType.INSTAGRAM_REEL,
  NodeType.BLUESKY_POST,
  NodeType.THREADS_POST
]);

/** Whether a social post of this type is shown with the provider's live widget. */
export function hasLiveSocialWidget(
  contentType: NodeType | string | undefined,
  isEmbed = false
): boolean {
  if (!contentType) return false;
  const types = isEmbed ? EMBED_LIVE_WIDGET_TYPES : LIVE_WIDGET_TYPES;
  return types.has(contentType as NodeType);
}

/** Most captured images shown in the app-rendered copy of a social post. */
export const MAX_CAPTURED_MEDIA = 4;

/**
 * Image URLs the clipper saved with a social post (`metadata.media`), keeping
 * only absolute https URLs, without duplicates, at most `MAX_CAPTURED_MEDIA`.
 */
export function resolveCapturedMediaUrls(metadata: unknown): string[] {
  if (typeof metadata !== "object" || metadata === null) return [];
  const media = (metadata as { media?: unknown }).media;
  if (!Array.isArray(media)) return [];
  const urls: string[] = [];
  for (const value of media) {
    if (typeof value !== "string") continue;
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      continue;
    }
    if (url.protocol !== "https:" || url.username || url.password) continue;
    const href = url.toString();
    if (!urls.includes(href)) urls.push(href);
    if (urls.length === MAX_CAPTURED_MEDIA) break;
  }
  return urls;
}
