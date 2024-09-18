import type {
  IBlock,
  IMarkdown
} from "$lib/client/components/markdown/md.type";
import {
  enumToString,
  properCase,
  truncateString
} from "$lib/shared/utils/text.utils";
import {
  type ITweetBody,
  NodeType,
  type INodeMetadata,
  type ITwitterProfileBody,
  ListType
} from "$lib/client/products/memotron/node/node.type";
import { getGeoLocation } from "$lib/client/utils/browser.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { commonMetadata } from "../common/urlMap";

export function resolveContentPreview(
  body: IMarkdown | ITweetBody | ITwitterProfileBody,
  contentType: NodeType,
  metadata?: any
) {
  logger.log({ at: "contentPreview", body, contentType });
  const truncateLength = 250;
  if (contentType === NodeType.TWEET && "content" in body) {
    if (body.content) return truncateString(body.content, truncateLength);
    else return metadata?.ogTitle ?? "";
  } else if (contentType === NodeType.TWITTER_PROFILE) {
    if (body.bio) return truncateString(body.bio, truncateLength);
    if (!body.url) return "";
    const hostPart = new URL(body.url).host;
    const ogImageUrl = commonMetadata.find(
      (x) => hostPart === x.domain || hostPart.includes("." + x.domain)
    )?.ogImage;
    return ogImageUrl ?? "";
  }
  if (body && typeof body === "object" && "blocks" in body) {
    const block = body.blocks[0];
    let strValue = "";
    if ("body" in block && typeof block.body === "string") {
      strValue = block.body;
    } else if (
      "body" in block &&
      typeof block.body != "string" &&
      block.body.contentType === NodeType.SIMPLE_TEXT &&
      "body" in block.body
    ) {
      strValue = block.body.body;
    }
    return truncateString(strValue, 100);
  } else if (
    typeof body === "object" &&
    "text" in body &&
    typeof body.text === "string"
  ) {
    return truncateString(body.text, 100);
  } else if (
    typeof body === "object" &&
    "comment" in body &&
    typeof body.comment === "string"
  ) {
    return truncateString(body.comment, 100);
  } else if (
    typeof body === "object" &&
    "selectedText" in body &&
    typeof body.selectedText === "string"
  ) {
    return truncateString(body.selectedText, 100);
  } else if (typeof body === "string") {
    return truncateString(body, 100);
  }
  return "";
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
          return `${b.listType === ListType.ORDERED ? "1." : "-"} ${b.body}`;
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
