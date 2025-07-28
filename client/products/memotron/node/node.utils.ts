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
  type INodeThumb,
  type INodeStructure
} from "$lib/client/products/memotron/node/node.type";
import { getGeoLocation } from "$lib/client/utils/browser.utils";
import { logger } from "$lib/client/components/debug/logger.client";
import { formatSeconds } from "$lib/client/utils/time.utils";
import { TimeFormat } from "$lib/client/types/time.type";
import { isRecordId } from "$lib/client/components/flux/resourceStores/resource.utils";
import type { IFile } from "$lib/client/components/files/file.type";
import { resolveUrlData } from "./url.utils";
import { isValidUrl } from "$lib/shared/utils/utils";
import type { IRecordId } from "$lib/client/types/data.type";

export function resolveContentPreview(node: INode) {
  const { body, contentType, metadata } = node;
  logger.log({ at: "contentPreview", body, contentType });

  if (contentType === NodeType.TWEET && "content" in body) {
    if (body.content) return body.content;
    else if (metadata && "ogTitle" in metadata) return metadata.ogTitle;
  } else if (contentType === NodeType.TWITTER_PROFILE) {
    if ("bio" in body && body.bio) return body.bio;
    if (!node.url) return "";

    const ogImageUrl = resolveUrlData(node.url)?.ogImage;
    return ogImageUrl ?? "";
  } else if (
    contentType === NodeType.TEXT_CLIP &&
    "text" in body &&
    body.text
  ) {
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

export function getMarkdownSymbolPrepended(block: IBlock) {
  switch (block.contentType) {
    case NodeType.SIMPLE_TEXT:
      block.body = block.body.replaceAll(/\n/g, "  \n");
      block.body = block.body.replaceAll("<div><br></div>", "  \n");
      block.body = block.body.replaceAll(/<br>/g, "  \n");
      block.body = block.body.replaceAll(
        /<span class="bg-aps2 px-0.5 text-b2 font-mono">(.*?)<\/span>/g,
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

export function resolveNodeIcon(contentType: NodeType, url?: string) {
  switch (contentType) {
    case NodeType.IMAGE:
      return "ph:image-light";
    case NodeType.WEB_SCREENSHOT_CLIP:
      return "crop";
    case NodeType.NODULAR_MARKDOWN:
      return "ph:markdown-logo-light";
    case NodeType.TEXT_CLIP:
      return "highlighter-circle";
    case NodeType.WEB_PAGE:
      return url && isValidUrl(url)
        ? resolveFallbackIconForUrl(url)
        : "ph:globe-light";
    case NodeType.PDF:
      return "file-pdf";
    case NodeType.AUDIO:
      return "music-note";
    case NodeType.VIDEO:
      return "video";
    case NodeType.FILE:
      return "ph:file-light";
    case NodeType.YOUTUBE_VIDEO:
      return "youtube-logo";
    case NodeType.YOUTUBE_CHANNEL:
      return "youtube-logo";
    case NodeType.YOUTUBE_TIMESTAMP_CLIP:
      return "youtube-logo";
    case NodeType.TWEET:
      return "ph:x-logo-light";
    case NodeType.TWITTER_PROFILE:
      return "ph:x-logo-light";
    case NodeType.KINDLE_BOOK:
      return "amazon-logo";
    case NodeType.KINDLE_HIGHLIGHT:
      return "ph:bookmark-simple-light";
    case NodeType.CODE:
    case NodeType.GIST:
      return "ph:code-light";
    default:
      return url && isValidUrl(url)
        ? resolveFallbackIconForUrl(url)
        : "book";
  }
}

export function resolveFallbackIconForUrl(url: string | undefined) {
  let hostPart;
  try {
    if (!url) return "globe";
    hostPart = new URL(url).host;
  } catch (e) {
    logger.error({ at: "resolveFallbackIconForUrl", e });
    return "globe";
  }
  if (hostPart === "replit.com" || hostPart.endsWith(".replit.com"))
    return "logos:replit-icon";
  if (hostPart === "github.com" || hostPart.endsWith(".github.com"))
    return "ph:github-logo";
  if (hostPart === "gitlab.com" || hostPart.endsWith(".gitlab.com"))
    return "logos:gitlab";
  if (hostPart === "pinterest.com" || hostPart.endsWith(".pinterest.com"))
    return "logos:pinterest-icon";
  if (hostPart === "youtube.com" || hostPart.endsWith(".youtube.com"))
    return "logos:youtube-icon";
  if (hostPart === "twitter.com" || hostPart.endsWith(".twitter.com"))
    return "x-logo";
  if (hostPart === "instagram.com" || hostPart.endsWith(".instagram.com"))
    return "ph:instagram-logo";
  if (hostPart === "linkedin.com" || hostPart.endsWith(".linkedin.com"))
    return "logos:linkedin-icon";
  if (hostPart === "facebook.com" || hostPart.endsWith(".facebook.com"))
    return "logos:facebook";
  if (hostPart === "reddit.com" || hostPart.endsWith(".reddit.com"))
    return "logos:reddit-icon";
  if (hostPart === "quora.com" || hostPart.endsWith(".quora.com"))
    return "logos:quora";
  if (hostPart === "wikipedia.org" || hostPart.endsWith(".wikipedia.org"))
    return "simple-icons:wikipedia";
  if (hostPart === "medium.com" || hostPart.endsWith(".medium.com"))
    return "logos:medium-icon";
  if (
    hostPart === "stackoverflow.com" ||
    hostPart.endsWith(".stackoverflow.com")
  )
    return "logos:stackoverflow-icon";
  if (hostPart === "dev.to" || hostPart.endsWith(".dev.to"))
    return "ph:dev-to-logo";
  if (hostPart === "drive.google.com" || hostPart.endsWith(".drive.google.com"))
    return "logos:google-drive";
  return "globe";
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
    case NodeType.TWEET:
      return "X Post";
    case NodeType.TWITTER_PROFILE:
      return "X Profile";
    default:
      return properCase(enumToString(contentType));
  }
}

export function resolveFilePreview(node: INode) {
  const { contentType, body, file, metadata } = node;
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
  } else if (contentType === NodeType.AUDIO) {
    if (file?.thumbnailUrl) return file;
    return metadata?.picture;
  } else if (
    contentType === NodeType.WEB_PAGE &&
    !metadata?.ogImage &&
    !metadata?.screenshotUrl
  ) {
    return metadata?.screenshotFile;
  } else if (contentType === NodeType.PDF && file?.thumbnailUrl) {
    return file;
  }
  return undefined;
}

export function resolveUrlPreview(node: INode) {
  const { contentType, body, metadata } = node;
  if (contentType === NodeType.WEB_PAGE) {
    return metadata?.ogImage ?? metadata?.screenshotUrl;
  } else if (
    contentType === NodeType.YOUTUBE_VIDEO ||
    contentType === NodeType.YOUTUBE_CHANNEL
  ) {
    return metadata?.ogImage ?? metadata?.thumbnailUrl;
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

export function resolveNodeLabelString(item: INodeThumb): string {
  if (item?.label && typeof item.label === "string") return item.label;
  const label = resolveNodeLabel(item);
  if (typeof label === "string") return label;
  if (
    label &&
    typeof label === "object" &&
    "text" in label &&
    typeof label.text === "string"
  ) {
    return label.text;
  }
  return "Untitled";
}

export function resolveNodeLabel(item: INodeThumb) {
  if (!item) return "";

  if (item.label && !item.parent) return item.label;

  let parent;
  if (item.parent && item.parent.id && !isRecordId(item.parent))
    parent = item.parent;
  const defaultLabels = {
    [NodeType.TEXT_CLIP]:
      "Clipped Text - " + (item.body as ITextClipBody)?.text,
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
      if (!parent?.label) return item.label ?? defaultLabels[item.contentType];
      const weburl = item.url?.split("://").pop()?.split("/")[0];
      return {
        label: item.label ? item.label + " - " : "Clipped from - ",
        parent,
        text: item.body?.text ?? item.text ?? `Clip: ${parent?.label ?? weburl}`
      };
    case NodeType.YOUTUBE_TIMESTAMP_CLIP:
      const timestamp = formatSeconds(item.body.timestamp, TimeFormat.CLOCK);
      if (!parent?.label)
        return item.label
          ? item.label + " - " + timestamp
          : `At - ${timestamp}`;
      return {
        label: `${item.label ? item.label + " - " : "At "}${timestamp}: `,
        parent,
        text: timestamp
      };
    case NodeType.TWEET:
      parent = parent as ITwitterProfile;
      const twitterProfileLabel = isValidString(
        parent?.label ?? parent?.body?.name
      )
        ? (parent.label ?? parent.body.name)
        : "Unknown";
      return {
        label: ` ${item.label ? item.label + " - " : ""} Tweet by: `,
        parent: { id: parent?.id, label: twitterProfileLabel },
        text: item.body?.content ?? item.text ?? `Tweet: ${twitterProfileLabel}`
      };
    case NodeType.TWITTER_PROFILE:
      item = item as ITwitterProfile;
      return (
        item.metadata?.ogTitle ||
        item.label ||
        ((item.body as ITwitterProfileBody).name
          ? item.body.name + " X profile"
          : "Unknown X profile")
      );
    default:
      return "";
  }

  function resolveVideoTimeStampStr(body: IVideoTimestampClipBody) {
    if (!body || typeof body.timestamp !== "number") return "00:00";
    return formatSeconds(body.timestamp, TimeFormat.CLOCK);
  }
}

export function resolveNodeFavicon(node: INode) {
  try {
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
    let favicon = resolveUrlData(node.url)?.faviconUrl;
    if (favicon) return favicon;
    //TODO - testing
    // favicon = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${hostPart}&size=128"`;
    // return favicon;
  } catch (e) {
    logger.error({ at: "resolveNodeFavicon", e });
    return;
  }
}

export function resolveFileIcon(file: IFile) {
  if (!file || (!file.type && !file.label)) return;
  if (file.type?.includes("zip") || file.label?.endsWith(".zip"))
    return "ph:file-zip-light";
  if (
    file.type?.includes("excel") ||
    file.label?.endsWith(".xlsx") ||
    file.label?.endsWith(".xls")
  )
    return "ph:file-xls-light";
  if (
    file.type?.includes("word") ||
    file.label?.endsWith(".docx") ||
    file.label?.endsWith(".doc")
  )
    return "ph:file-doc-light";
  if (file.type?.includes("powerpoint") || file.label?.endsWith(".pptx"))
    return "ph:file-ppt-light";

  if (file.type?.includes("csv") || file.label?.endsWith(".csv"))
    return "ph:file-csv-light";

  if (file.type?.includes("html") || file.label?.endsWith(".html"))
    return "ph:file-html-light";

  if (file.type?.includes("text") || file.label?.endsWith(".txt"))
    return "ph:file-txt-light";

  return "ph:file-light";
}

/**
 * Disabling for tweets for now as the favicon is not present in tweet node metadata anymore.
 * @param node
 * @returns
 */
export function resolveNodeGraphFill(node: INode) {
  if (
    // node.contentType === NodeType.TWEET ||
    node.contentType === NodeType.TWITTER_PROFILE
  )
    return "black";
}

export function resolveNodeSubTypesForSwitcher() {
  const nodeTypes = [
    NodeType.NODULAR_MARKDOWN,
    NodeType.PDF,
    NodeType.IMAGE,
    NodeType.AUDIO,
    NodeType.VIDEO,
    NodeType.WEB_PAGE,
    NodeType.GIST,
    NodeType.TEXT_CLIP,
    NodeType.WEB_SCREENSHOT_CLIP,
    NodeType.TWEET,
    NodeType.TWITTER_PROFILE,
    NodeType.YOUTUBE_VIDEO,
    NodeType.YOUTUBE_TIMESTAMP_CLIP,
    NodeType.KINDLE_BOOK,
    NodeType.KINDLE_HIGHLIGHT
  ].map((x) => {
    return {
      label: resolveNodeContentLabel(x),
      value: x.toLowerCase(),
      icon: resolveNodeIcon(x)
    };
  });
  return nodeTypes;
}

export function resolveHeadingParent(
  id: IRecordId,
  structure: INodeStructure[],
  scopedParent: IRecordId[]
) {
  try {
    const hierarchy = structure
      .slice(
        0,
        structure.findIndex((x) => x.id === id)
      )
      .filter((x) => {
        const currentFactor = structure.find((s) => s.id === id)?.factor;
        return currentFactor !== undefined && x.factor < currentFactor;
      })
      .reverse()
      .reduce((acc, curr) => {
        const existingForFactor = acc.find((x) => x.factor === curr.factor);
        if (!existingForFactor) {
          acc.push(curr);
        }
        return acc;
      }, [] as INodeStructure[])
      .sort((a, b) => a.factor - b.factor)
      .map((x) => x.id);
    return [...scopedParent, ...hierarchy];
  } catch (e) {
    logger.error({ at: "resolveHeadingParent", e });
    return scopedParent;
  }
}
