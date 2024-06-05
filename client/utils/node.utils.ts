import type { IMarkdown } from "$lib/client/types/memotron/md.type";
import { truncateString } from "$lib/client/utils/text.utils";
import {
  NodeType,
  type NodeMetadataCapturedAtClient
} from "$lib/client/types/memotron/node.type";
import type { ClipContent } from "$lib/client/types/clip.type";
import { getGeoLocation } from "./browser.utils";

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
  } else if (typeof body === "string") {
    return truncateString(body, 100);
  }
  return "";
}

export async function resolveNodeCaptureMetadata() {
  let metadata: NodeMetadataCapturedAtClient = {};
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
