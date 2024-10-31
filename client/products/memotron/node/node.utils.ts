import type { IBlock } from "$lib/client/components/markdown/md.type";
import { enumToString, properCase } from "$lib/shared/utils/text.utils";
import {
  NodeType,
  type INodeMetadata,
  ListType,
  type INode
} from "$lib/client/products/memotron/node/node.type";
import { getGeoLocation } from "$lib/client/utils/browser.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { urlMap } from "../common/urlMap";

export function resolveContentPreview(node: INode) {
  const { body, contentType, metadata } = node;
  logger.log({ at: "contentPreview", body, contentType });

  if (contentType === NodeType.TWEET && "content" in body) {
    if (body.content) return body.content;
    else if (metadata && "ogTitle" in metadata) return metadata.ogTitle;
  } else if (contentType === NodeType.TWITTER_PROFILE) {
    if ("bio" in body && body.bio) return body.bio;
    if (!node.url) return "";
    const hostPart = new URL(node.url).host;
    const ogImageUrl = urlMap.find(
      (x) => hostPart === x.domain || hostPart.includes("." + x.domain)
    )?.ogImage;
    return ogImageUrl ?? "";
  } else if (contentType === NodeType.TEXT_CLIP && "text" in body) {
    return body.text;
  } else if (node.mdText && typeof node.mdText === "string") {
    return node.mdText;
  } else if (contentType === NodeType.KINDLE_HIGHLIGHT && "text" in body) {
    return body.text;
  }
  return undefined;
}

export async function resolveNodeCaptureMetadata() {
  let metadata: INodeMetadata = {};
  let geoLocation: GeolocationPosition | undefined;
  try {
    geoLocation = await getGeoLocation();
    const location = {
      latitude: geoLocation?.coords.latitude ?? 0,
      longitude: geoLocation?.coords.longitude ?? 0,
      accuracy: geoLocation?.coords.accuracy ?? 0
    };
    metadata = { ...metadata, location };
  } catch (e) {
    console.error({ e });
  }
  return metadata;
}

export function generateMarkdownText(blocks: IBlock[]) {
  return blocks
    .map((b) => {
      switch (b.contentType) {
        case NodeType.SIMPLE_TEXT:
          b.body = b.body.replaceAll(/\n/g, "  \n");
          b.body = b.body.replaceAll("<div><br></div>", "  \n");
          b.body = b.body.replaceAll(/<br>/g, "  \n");
          b.body = b.body.replaceAll(
            /<span class="bg-gray-200 px-1 font-mono">(.*?)<\/span>/g,
            "`$1`"
          );
          b.body = b.body.replaceAll(/<i>(.*?)<\/i>/g, "*$1*");
          b.body = b.body.replaceAll(/<b>(.*?)<\/b>/g, "**$1**");
          b.body = b.body.replaceAll(/<span id="[^"]*">(.*?)<\/span>/g, "$1");
          b.body = b.body.replaceAll(/<span>(.*?)<\/span>/g, "$1");
          b.body = b.body.replaceAll(/<div>(.*?)<\/div>/g, "\n $1");
          //todo - add remaining inline style patterns
          return b.body;
        case NodeType.HEADING1:
          return `# ${b.body}`;
        case NodeType.HEADING2:
          return `## ${b.body}`;
        case NodeType.HEADING3:
          return `### ${b.body}`;
        case NodeType.HEADING4:
          return `#### ${b.body}`;
        case NodeType.HEADING5:
          return `##### ${b.body}`;
        case NodeType.DOUBLE_DIVIDER:
          return `---`;
        case NodeType.DIVIDER:
          return `===`;
        case NodeType.QUOTE:
          return `> ${b.body}`;
        case NodeType.LIST:
        case NodeType.ORDERED_LIST:
        case NodeType.CHECKLIST:
          return `- ${b.body.text}`;
        case NodeType.CALLOUT:
        case NodeType.CODE:
          return b.body.text;
      }
    })
    .join("\n");
}

export function resolveNodeIcon(contentType: NodeType) {
  switch (contentType) {
    case NodeType.IMAGE:
      return "ph:image-light";
    case NodeType.WEB_SCREENSHOT_CLIP:
      return "ph:crop-light";
    case NodeType.NODULAR_MARKDOWN:
      return "ph:markdown-logo-light";
    case NodeType.TEXT_CLIP:
      return "ph:highlighter-circle-light";
    case NodeType.WEB_PAGE:
      return "ph:globe-light";
    case NodeType.PDF:
      return "ph:file-pdf-light";
    case NodeType.AUDIO:
      return "ph:music-note-light";
    case NodeType.VIDEO:
      return "ph:video-light";
    case NodeType.FILE:
      return "ph:file-light";
    case NodeType.YOUTUBE_VIDEO:
      return "ph:youtube-logo-light";
    case NodeType.YOUTUBE_CHANNEL:
      return "ph:youtube-logo-light";
    case NodeType.YOUTUBE_TIMESTAMP_CLIP:
      return "ph:youtube-logo-light";
    case NodeType.TWEET:
      return "ph:x-logo-light";
    case NodeType.TWITTER_PROFILE:
      return "ph:x-logo-light";
    case NodeType.KINDLE_BOOK:
      return "ph:amazon-logo-light";
    case NodeType.KINDLE_HIGHLIGHT:
      return "ph:bookmark-simple-light";
    default:
      return "ph:document-light";
  }
}

export function resolveNodeContentLabel(contentType: NodeType) {
  switch (contentType) {
    case NodeType.NODULAR_MARKDOWN:
      return "Markdown";
    case NodeType.SIMPLE_TEXT:
      return "Text";
    case NodeType.TEXT_CLIP:
      return "Web Text clip";
    case NodeType.WEB_SCREENSHOT_CLIP:
      return "Web Screenshot";
    case NodeType.YOUTUBE_TIMESTAMP_CLIP:
      return "Youtube Clip";
    default:
      return properCase(enumToString(contentType));
  }
}

export function resolveFilePreview(node: INode) {
  const { contentType, body, file } = node;
  if (
    contentType === NodeType.IMAGE ||
    contentType == NodeType.AUDIO ||
    contentType === NodeType.PDF
  ) {
    return file;
  } else if (contentType === NodeType.WEB_SCREENSHOT_CLIP) {
    return body.file;
  } else if (contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP) {
    return body.thumbnail;
  }
  return undefined;
}

export function resolveUrlPreview(node: INode) {
  const { contentType, body, metadata } = node;
  if (
    contentType === NodeType.WEB_PAGE ||
    contentType === NodeType.YOUTUBE_VIDEO
  ) {
    return metadata?.ogImage ?? metadata?.screenshotUrl;
  } else if (contentType === NodeType.TWITTER_PROFILE) {
    return body?.profileImageUrl;
  } else if (contentType === NodeType.KINDLE_BOOK) {
    return body?.imageUrl;
  }
  return undefined;
}

/**
 * If the image preview should contain instead of cover - cases like kindle books which are blurred if cover
 */
export function resolveIfImageShouldContain(contentType: NodeType) {
  return contentType === NodeType.KINDLE_BOOK;
}
