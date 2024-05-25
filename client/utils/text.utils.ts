import type { ItemType } from "$lib/client/types/item.enum";
import type { EmailParts } from "$lib/client/types/account.type";
import type { Block, Markdown } from "$lib/client/types/memotron/md.type";
import {
  ListType,
  NodeType,
  type TextContent
} from "$lib/client/types/memotron/node.type";
import { isValidArrayWithData } from "./obj.utils";

export function properCase(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  // if (!str) return str;
  // return str.replace(/\w\S*/g, function (text) {
  //   return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  // });
}

export function prefixTable(id: string | number, itemType: ItemType) {
  return `${itemType}:${id}`;
}

export function stripTablePrefix(id: string) {
  return id.split(":")[1];
}
export function prefix(str: string, prefix: string) {
  return `${prefix}${str}`;
}

export function isValidEmail(text: string) {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,}$/;
  return emailRegex.test(text);
}

export function isValidParentDomain(text: string) {
  const domainRegex = /^(?:[a-zA-Z0-9-]{1,}\.){1,}[a-zA-Z0-9]{2,}$/;
  return domainRegex.test(text);
}

export function frameEmailFromParts(parts: EmailParts) {
  return `${parts.firstFew}...${parts.lastFew ?? ""}@${parts.emailDomain}`;
}

export function generateMarkdownText(blocks: Block[]) {
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
        // case NodeType.DOUBLE_DIVIDER:
        //   return `---`;
        // case NodeType.DIVIDER:
        //   return `---`;
        case NodeType.LIST:
          return `${b.listType === ListType.ORDERED ? "1." : "-"} ${b.body}`;
      }
    })
    .join("\n");
}

export function isValidMarkdown(md: Markdown) {
  return (
    md &&
    md.blocks &&
    isValidArrayWithData(md.blocks) &&
    md.blocks.length > 0 &&
    ((md.blocks.length === 1 &&
      "body" in md.blocks[0] &&
      md.blocks[0].body != "") ||
      md.blocks.length > 1)
  );
}
/**
 * Checks if a string is valid and not empty or null or any other falsy value as string. Returns the string if valid, otherwise returns undefined.
 * @param str The string to check
 * @returns The string if valid, otherwise undefined
 */
export function isValidString(str: string | undefined | null) {
  const isValid = str && str != "" && str != "null" && str != "undefined";
  if (isValid) return str;
  return undefined;
}

export function truncateString(str: string, length: number) {
  if (str.length > length) return str.slice(0, length) + "...";
  return str;
}

export function enumToString(val: any, isProperCase: boolean = true) {
  const str = val.toString().split("_").join(" ").split("-").join(" ");
  return isProperCase ? properCase(str) : str;
}
