import type { IBlock } from "$lib/client/components/markdown/md.type";
import {
  enumToString,
  isValidString,
  properCase
} from "$lib/shared/utils/text.utils";
import {
  NodeType,
  type INodeMetadata,
  ListType,
  type INode,
  type ITwitterProfileBody,
  type ITextClipBody,
  type IVideoTimestampClipBody,
  type ITwitterProfile,
  type INodeThumb
} from "$lib/client/products/memotron/node/node.type";
import { getGeoLocation } from "$lib/client/utils/browser.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { urlMap } from "../common/urlMap";
import { formatSeconds } from "$lib/client/utils/time.utils";
import { TimeFormat } from "$lib/client/types/time.type";
import { isRecordId } from "$lib/client/components/flux/resourceStores/resource.utils";

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
  } else if (node.text && typeof node.text === "string") {
    return node.text;
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

export function getMarkdownSymbolPrepended(block: IBlock) {
  switch (block.contentType) {
    case NodeType.SIMPLE_TEXT:
      block.body = block.body.replaceAll(/\n/g, "  \n");
      block.body = block.body.replaceAll("<div><br></div>", "  \n");
      block.body = block.body.replaceAll(/<br>/g, "  \n");
      block.body = block.body.replaceAll(
        /<span class="bg-gray-200 px-1 font-mono">(.*?)<\/span>/g,
        "`$1`"
      );
      block.body = block.body.replaceAll(/<i>(.*?)<\/i>/g, "*$1*");
      block.body = block.body.replaceAll(/<b>(.*?)<\/b>/g, "**$1**");
      block.body = block.body.replaceAll(
        /<span id="[^"]*">(.*?)<\/span>/g,
        "$1"
      );
      block.body = block.body.replaceAll(/<span>(.*?)<\/span>/g, "$1");
      block.body = block.body.replaceAll(/<div>(.*?)<\/div>/g, "\n $1");
      //todo - add remaining inline style patterns
      return block.body;
    case NodeType.HEADING1:
      return `# ${block.label ?? block.body}`;
    case NodeType.HEADING2:
      return `## ${block.label ?? block.body}`;
    case NodeType.HEADING3:
      return `### ${block.label ?? block.body}`;
    case NodeType.HEADING4:
      return `#### ${block.label ?? block.body}`;
    case NodeType.HEADING5:
      return `##### ${block.label ?? block.body}`;
    case NodeType.DOUBLE_DIVIDER:
      return `---`;
    case NodeType.DIVIDER:
      return `===`;
    case NodeType.QUOTE:
      return `> ${block.body}`;
    case NodeType.LIST:
    case NodeType.ORDERED_LIST:
    case NodeType.CHECKLIST:
      return `- ${block.body.text}`;
    case NodeType.CALLOUT:
    case NodeType.CODE:
      return block.body.text;
  }
}
export function generateMarkdownText(blocks: IBlock[]) {
  return blocks.map((b) => getMarkdownSymbolPrepended(b)).join("\n");
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
      return "ph:book-light";
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
    contentType === NodeType.FILE ||
    contentType === NodeType.VIDEO
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

export function resolveNodeLabelString(item: INodeThumb) {
  if (item.label) return item.label;
  const label = resolveNodeLabel(item);
  if (typeof label === "string") return label;
  if ("text" in label) return label.text;
  return "";
}

export function resolveNodeLabel(item: INodeThumb) {
  if (!item) return "";

  if (item.label) return item.label;

  let parent;
  if (item.parent && item.parent.id && !isRecordId(item.parent))
    parent = item.parent;
  const defaultLabels = {
    [NodeType.TEXT_CLIP]: "Clipped Text - " + (item.body as ITextClipBody).text,
    [NodeType.YOUTUBE_TIMESTAMP_CLIP]:
      "Video timestamp - " +
      resolveVideoTimeStampStr(item.body as IVideoTimestampClipBody),
    [NodeType.WEB_SCREENSHOT_CLIP]: "Web screenshot",
    [NodeType.TWEET]: "Unknown tweet",
    [NodeType.KINDLE_HIGHLIGHT]: "Kindle highlight"
  };

  switch (item.contentType) {
    case NodeType.TEXT_CLIP:
    case NodeType.WEB_SCREENSHOT_CLIP:
    case NodeType.KINDLE_HIGHLIGHT:
      if (!parent?.label) return defaultLabels[item.contentType];
      return {
        label: "Clipped from:",
        parent,
        text: item.body?.text ?? "Unknown clip"
      };
    case NodeType.YOUTUBE_TIMESTAMP_CLIP:
      const timestamp = formatSeconds(item.body.timestamp, TimeFormat.CLOCK);
      if (!parent?.label) return `At - ${timestamp}`;
      return {
        label: `${timestamp} - `,
        parent,
        text: timestamp
      };
    case NodeType.TWEET:
      parent = parent as ITwitterProfile;
      const twitterProfileLabel = isValidString(parent?.body?.name)
        ? parent.body.name
        : "Unknown";
      return {
        label: "Tweet by ",
        parent: { id: parent?.id, label: twitterProfileLabel },
        text: item.body?.content
      };
    case NodeType.TWITTER_PROFILE:
      item = item as ITwitterProfile;
      return (
        item.metadata?.ogTitle ||
        ((item.body as ITwitterProfileBody).name
          ? item.body.name + " X profile"
          : "Unknown X profile")
      );
    default:
      return "";
  }

  function resolveVideoTimeStampStr(body: IVideoTimestampClipBody) {
    return formatSeconds(body.timestamp, TimeFormat.CLOCK);
  }
}

export function resolveNodeFavicon(node: INode) {
  if (
    node.contentType === NodeType.TWITTER_PROFILE &&
    "profileImageUrl" in node.body &&
    node.body.profileImageUrl
  ) {
    return node.body.profileImageUrl;
  } else if (
    node.contentType === NodeType.KINDLE_BOOK &&
    "imageUrl" in node.body &&
    node.body.imageUrl
  ) {
    return node.body.imageUrl;
  } else if (node.metadata?.faviconLink) {
    return node.metadata.faviconLink;
  } else if (node.parent) {
    //TODO - resolve using context API
    // const parent = await dexie.node.get(node.parent);
    // if (parent && parent.metadata?.faviconLink)
    //   return parent.metadata.faviconLink;
  }

  if (!("url" in node) || !node.url || !node.url.includes("https://")) return;
  const hostPart = new URL(node.url).host;
  let favicon = urlMap.find(
    (x) => hostPart === x.domain || hostPart.includes("." + x.domain)
  )?.faviconUrl;
  if (favicon) return favicon;
  //TODO - testing
  favicon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostPart}&size=128"`;
  return favicon;
}

export function resolveNodeGraphFill(node: INode) {
  if (
    node.contentType === NodeType.TWEET ||
    node.contentType === NodeType.TWITTER_PROFILE
  )
    return "black";
}
