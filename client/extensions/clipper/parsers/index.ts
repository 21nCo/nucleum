import { NodeType } from "@21n/products/memotron/node/node.type";
import type {
  IWebpageParser,
  ISocialPostParser,
  IVideoBookmarkParser
} from "@21n/extensions/clipper/clipper.type";
import {
  extractBskyPostFromPage,
  extractBskyPostFromInlineClip,
  extractBlueskyProfile
} from "@21n/extensions/clipper/parsers/blueskyParser";
import { extractCourseraBookmark } from "@21n/extensions/clipper/parsers/courseraParser";
import {
  extractFacebookPostFromPage,
  extractFacebookPostFromInlineClip,
  extractFacebookProfile
} from "@21n/extensions/clipper/parsers/facebookParser";
import {
  extractInstagramPostFromPage,
  extractInstagramPostFromInlineClip,
  extractInstagramProfileFromPage
} from "@21n/extensions/clipper/parsers/instagramParser";
import {
  extractLinkedInPostFromPage,
  extractLinkedInPostFromInlineClip,
  extractLinkedInProfile
} from "@21n/extensions/clipper/parsers/linkedinParser";
import {
  extractMastodonPostFromPage,
  extractMastodonPostFromInlineClip,
  extractMastodonProfile
} from "@21n/extensions/clipper/parsers/mastodonParser";
import {
  extractRedditPostFromPage,
  extractRedditPostFromInlineClip
} from "@21n/extensions/clipper/parsers/redditParser";
import {
  extractThreadsPostFromPage,
  extractThreadsPostFromInlineClip,
  extractThreadsProfile
} from "@21n/extensions/clipper/parsers/threadsParser";
import {
  extractTweetFromTweetPage,
  extractTweetFromInlineClip,
  extractTwitterProfile
} from "@21n/extensions/clipper/parsers/twitterParser";
import { extractUdemyBookmark } from "@21n/extensions/clipper/parsers/udemyParser";
import { extractYoutubeBookmark } from "@21n/extensions/clipper/parsers/youtubeParser";

const parserMap = new Map<NodeType, IWebpageParser>([
  [NodeType.TWEET, extractTweetFromTweetPage],
  [NodeType.TWITTER_PROFILE, extractTwitterProfile],
  [NodeType.LINKEDIN_POST, extractLinkedInPostFromPage],
  [NodeType.LINKEDIN_PROFILE, extractLinkedInProfile],
  [NodeType.BLUESKY_POST, extractBskyPostFromPage],
  [NodeType.BLUESKY_PROFILE, extractBlueskyProfile],
  [NodeType.THREADS_POST, extractThreadsPostFromPage],
  [NodeType.THREADS_PROFILE, extractThreadsProfile],
  [NodeType.INSTAGRAM_POST, extractInstagramPostFromPage],
  [NodeType.INSTAGRAM_REEL, extractInstagramPostFromPage],
  [NodeType.INSTAGRAM_PROFILE, extractInstagramProfileFromPage],
  [NodeType.REDDIT_POST, extractRedditPostFromPage],
  [NodeType.FACEBOOK_POST, extractFacebookPostFromPage],
  [NodeType.FACEBOOK_PROFILE, extractFacebookProfile],
  [NodeType.MASTODON_POST, extractMastodonPostFromPage],
  [NodeType.MASTODON_PROFILE, extractMastodonProfile]
]);

const inlineSocialPostParserMap = new Map<NodeType, ISocialPostParser>([
  [NodeType.TWEET, extractTweetFromInlineClip],
  [NodeType.LINKEDIN_POST, extractLinkedInPostFromInlineClip],
  [NodeType.BLUESKY_POST, extractBskyPostFromInlineClip],
  [NodeType.THREADS_POST, extractThreadsPostFromInlineClip],
  [NodeType.INSTAGRAM_POST, extractInstagramPostFromInlineClip],
  [NodeType.INSTAGRAM_REEL, extractInstagramPostFromInlineClip],
  [NodeType.REDDIT_POST, extractRedditPostFromInlineClip],
  [NodeType.FACEBOOK_POST, extractFacebookPostFromInlineClip],
  [NodeType.MASTODON_POST, extractMastodonPostFromInlineClip]
]);

const videoBookmarkParserMap = new Map<NodeType, IVideoBookmarkParser>([
  [NodeType.YOUTUBE_VIDEO, extractYoutubeBookmark],
  [NodeType.YOUTUBE_SHORT, extractYoutubeBookmark],
  [NodeType.COURSERA_VIDEO, extractCourseraBookmark],
  [NodeType.UDEMY_VIDEO, extractUdemyBookmark]
]);

export function resolveParser(
  contentType: NodeType
): IWebpageParser | undefined {
  if (!parserMap.has(contentType)) return;
  return parserMap.get(contentType);
}

export function resolveInlineSocialPostParser(
  contentType: NodeType
): ISocialPostParser | undefined {
  if (!inlineSocialPostParserMap.has(contentType)) return;
  return inlineSocialPostParserMap.get(contentType);
}

export function resolveVideoBookmarkParser(
  contentType: NodeType
): IVideoBookmarkParser | undefined {
  if (!videoBookmarkParserMap.has(contentType)) return;
  return videoBookmarkParserMap.get(contentType);
}
