import type { Markdown } from "$lib/tidy/types/memotron/md.type";
import { truncateString } from "$lib/tidy/utils/text.utils";
import { NodeType } from "../types/memotron/node.type";
import type { ClipContent } from "../types/clip.type";

export function contentPreview(body: Markdown | ClipContent) {
  if (body && "blocks" in body) {
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
  } else if ("text" in body && typeof body.text === "string") {
    return truncateString(body.text, 100);
  }
  return "";
}
