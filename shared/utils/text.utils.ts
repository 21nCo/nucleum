import type { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import type { EmailParts } from "$lib/client/types/account.type";
import type { IMarkdown } from "$lib/client/components/markdown/md.type";

import { isValidArrayWithData } from "./obj.utils";
import { Display } from "../../client/types/view.type";
import { Size } from "../../client/types/size.enum";

export function properCase(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  // if (!str) return str;
  // return str.replace(/\w\S*/g, function (text) {
  //   return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  // });
}

export function prefixTable(id: string | number, itemType: Resource) {
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

export function isValidMarkdown(md: IMarkdown) {
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
  const isValid =
    str &&
    str != "" &&
    str != "null" &&
    str != "undefined" &&
    str != "NaN" &&
    str != "false" &&
    str != "0" &&
    str != "none";
  if (isValid) return str;
  return undefined;
}

export function isValidDataString(str: string) {
  return isValidString(str) && !isNaN(new Date(str).getTime());
}

export function truncateString(str: string, length: number | undefined) {
  if (!length) return str;
  if (str.length > length) return str.slice(0, length) + "...";
  return str;
}

export function enumToString(val: any, isProperCase: boolean = true) {
  const str = val.toString().split("_").join(" ").split("-").join(" ");
  return isProperCase ? properCase(str) : str;
}

export function enumToCamelCase(val: any) {
  let output = "";
  val
    .toString()
    .split("_")
    .forEach((x, index) => {
      if (index === 0) output += x.toLowerCase();
      else output += x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
    });
  return output;
}

export function determineTruncateLength(
  display: Display,
  space: Size.sm | Size.md | Size.lg = Size.md
) {
  if (space === Size.lg) {
    if (display === Display.MO || display === Display.CW) {
      return 20;
    } else if (display === Display.TP || display === Display.DP) {
      return 40;
    } else if (display === Display.TK) {
      return 60;
    } else {
      return 20;
    }
  } else if (space === Size.md) {
    if (display === Display.MO || display === Display.CW) {
      return 12;
    } else if (display === Display.TP || display === Display.DP) {
      return 20;
    } else if (display === Display.TK) {
      return 30;
    } else {
      return 12;
    }
  } else {
    if (display === Display.MO || display === Display.CW) {
      return 8;
    } else if (display === Display.TP || display === Display.DP) {
      return 12;
    } else if (display === Display.TK) {
      return 20;
    } else {
      return 8;
    }
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}
