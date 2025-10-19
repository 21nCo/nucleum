import type { ILinkTag } from "@21n/products/memotron/linking/link.type";

export function linkTagLabelMapper(tag: ILinkTag) {
  const label = tag.group
    ? `${tag.group}:${tag.label}`
    : tag.label || "Unknown";
  return {
    ...tag,
    label
  };
}
