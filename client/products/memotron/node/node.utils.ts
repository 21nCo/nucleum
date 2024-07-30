import type { IMarkdown } from "$lib/client/components/markdown/md.type";
import { truncateString } from "$lib/shared/utils/text.utils";
import {
  NodeType,
  type INodeMetadata
} from "$lib/client/products/memotron/node/node.type";
import type { ClipContent } from "$lib/client/products/memotron/common/clip.type";
import { getGeoLocation } from "$lib/client/utils/browser.utils";

export function contentPreview(body: IMarkdown | ClipContent) {
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
