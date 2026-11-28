/**
 * Turns a stored avatar `code` into plain text for rendering.
 *
 * Avatars are record fields that other users can write (shared spaces, nodes
 * and collections), so a code is never rendered as HTML. Codes the picker
 * stores are numeric character references such as `&#X1F600` (emoji) or
 * `&#XE88E` (a Material Symbols code point); those are decoded here and
 * rendered as text.
 */

const NUMERIC_REFERENCE = /&#(?:[xX]([0-9a-fA-F]{1,6})|([0-9]{1,7}));?/g;
const NUMERIC_REFERENCE_SEQUENCE =
  /^(?:&#(?:[xX][0-9a-fA-F]{1,6}|[0-9]{1,7});?)+$/;
/** Material Symbols ligature names, e.g. `info` or `zoom_out_map`. */
const ICON_LIGATURE = /^[a-z0-9_]+$/;

function decodeNumericReferences(code: string): string {
  return code.replace(NUMERIC_REFERENCE, (reference, hex, decimal) => {
    const codePoint = hex ? parseInt(hex, 16) : parseInt(decimal, 10);
    const valid =
      codePoint > 0 &&
      codePoint <= 0x10ffff &&
      !(codePoint >= 0xd800 && codePoint <= 0xdfff);
    return valid ? String.fromCodePoint(codePoint) : "";
  });
}

/**
 * Text for an icon avatar: a ligature name made of `[a-z0-9_]`, or a run of
 * numeric character references. Anything else renders nothing.
 */
export function avatarIconText(code: unknown): string {
  if (typeof code !== "string") return "";
  if (ICON_LIGATURE.test(code)) return code;
  if (NUMERIC_REFERENCE_SEQUENCE.test(code)) {
    return decodeNumericReferences(code);
  }
  return "";
}

/**
 * Text for an emoji avatar: numeric character references are decoded and any
 * other characters are kept as literal text.
 */
export function avatarEmojiText(code: unknown): string {
  if (typeof code !== "string") return "";
  return decodeNumericReferences(code);
}
