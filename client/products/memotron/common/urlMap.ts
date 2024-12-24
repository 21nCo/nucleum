/**
 * Web URLs that only support screen shots. Options like save page, text highlighter, summarize will all be disabled for these pages.
 */
export const screenShotOnlyPages = [
  /^https:\/\/app\.[^\/]+\/.*/,
  /^https:\/\/(?:twitter\.com|x\.com)\/(?:(i|jobs|explore|home|settings|messages|notifications|search|hashtag|compose)(?:\/(.+))?|([^\/]+)\/lists)?\/?$/
];

/**
 * Web URLs that only support saving page and screenshot. Options like text highlighter, summarize will be disabled for these pages.
 */
export const saveOnlyPages = [
  /^https?:\/\/(?:www\.|)?figma\.com\/(?:design|files)\/.+/,
  /^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\/.*/
];

/**
 * @deprecated - use commonMetadata instead
 */
export const minimalMetadataPages = [
  "wikipedia.org",
  "youtube.com",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "reddit.com",
  "pinterest.com",
  "tiktok.com",
  "linkedin.com",
  "medium.com",
  "github.com",
  "stackoverflow.com",
  "google.com",
  "amazon.com",
  "apple.com",
  "microsoft.com",
  "ebay.com",
  "tumblr.com",
  "wordpress.com",
  "discord.com",
  "twitch.tv",
  "patreon.com",
  "soundcloud.com"
];
