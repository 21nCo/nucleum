import { Item, type ItemType } from "$lib/tidy/types/item.enum";
import type { EmailParts } from "../types/account.type";

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
