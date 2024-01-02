import { Item, type ItemType } from "$lib/tidy/types/item.enum";
import type { EmailParts } from "../types/account.type";
import {
  MdBlockType,
  type Block,
  ListType,
  type BasicMarkdown,
} from "../types/md.type";
import { isValidArray } from "./obj.utils";

export function properCase(str: string) {
  if (!str) return str;
  return str.replace(/\w\S*/g, function (text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  });
}

export function prefixDb(id: string | number, itemType: ItemType) {
  return `${Item[itemType]}:${id}`;
}

export function stripDbPrefix(id: string) {
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
      switch (b.content.type) {
        case MdBlockType.SIMPLE_TEXT:
          b.content.body = b.content.body.replaceAll(/\n/g, "  \n");
          b.content.body = b.content.body.replaceAll("<div><br></div>", "  \n");
          b.content.body = b.content.body.replaceAll(/<br>/g, "  \n");
          b.content.body = b.content.body.replaceAll(
            /<span class="bg-gray-200 px-1 font-mono">(.*?)<\/span>/g,
            "`$1`"
          );
          b.content.body = b.content.body.replaceAll(/<i>(.*?)<\/i>/g, "*$1*");
          b.content.body = b.content.body.replaceAll(
            /<b>(.*?)<\/b>/g,
            "**$1**"
          );
          b.content.body = b.content.body.replaceAll(
            /<span id="[^"]*">(.*?)<\/span>/g,
            "$1"
          );
          b.content.body = b.content.body.replaceAll(
            /<span>(.*?)<\/span>/g,
            "$1"
          );
          b.content.body = b.content.body.replaceAll(
            /<div>(.*?)<\/div>/g,
            "\n $1"
          );
          //todo - add remaining inline style patterns
          return b.content.body;
        case MdBlockType.HEADING1:
          return `# ${b.content.body}`;
        case MdBlockType.HEADING2:
          return `## ${b.content.body}`;
        case MdBlockType.HEADING3:
          return `### ${b.content.body}`;
        case MdBlockType.HEADING4:
          return `#### ${b.content.body}`;
        case MdBlockType.HEADING5:
          return `##### ${b.content.body}`;
        case MdBlockType.DOUBLE_DIVIDER:
          return `---`;
        case MdBlockType.DIVIDER:
          return `---`;
        case MdBlockType.LIST:
          return `${b.content.body.type === ListType.ORDERED ? "1." : "-"} ${
            b.content.body.content
          }`;
      }
    })
    .join("\n");
}

export function isValidMarkdown(md: BasicMarkdown) {
  return (
    md.blocks &&
    isValidArray(md.blocks) &&
    md.blocks.length > 0 &&
    ((md.blocks.length === 1 &&
      "body" in md.blocks[0].content &&
      md.blocks[0].content.body != "") ||
      md.blocks.length > 1)
  );
}
