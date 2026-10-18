import { type IMediaGridItem } from "@nucleum/features/memory/node/node.type";
import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
import type { IBlock } from "@nucleum/features/memory/markdown/md.type";

type IClipboardBlockType =
  | NodeType.CODE
  | NodeType.CALLOUT
  | NodeType.LIST
  | NodeType.ORDERED_LIST
  | NodeType.CHECKLIST
  | NodeType.SIMPLE_TEXT;

/** Selects a supported Markdown block kind for pasted content. */
export function resolveClipboardBlockType(
  contentType?: NodeType
): IClipboardBlockType {
  switch (contentType) {
    case NodeType.CODE:
    case NodeType.CALLOUT:
    case NodeType.LIST:
    case NodeType.ORDERED_LIST:
    case NodeType.CHECKLIST:
      return contentType;
    default:
      return NodeType.SIMPLE_TEXT;
  }
}

/** Copies typed-array bytes into a Blob-compatible ArrayBuffer. */
export function resolveBlobPart(data: Uint8Array<ArrayBufferLike>) {
  return Uint8Array.from(data).buffer;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

/** Narrows an unknown object to a named string property. */
export function hasStringProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, string> {
  return isObject(value) && typeof value[key] === "string";
}

/** Recognizes a Markdown media-grid block with an item array. */
export function isMediaGridBlock(block: IBlock): block is IBlock & {
  contentType: NodeType.MEDIA_GRID;
  body: { items: IMediaGridItem[] };
} {
  return (
    block.contentType === NodeType.MEDIA_GRID &&
    isObject(block.body) &&
    "items" in block.body &&
    Array.isArray(block.body.items)
  );
}
