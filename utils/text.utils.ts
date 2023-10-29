import { Item, type ItemType } from "$lib/local/types/item.enum";

export function properCase(str: string) {
  return str.replace(/\w\S*/g, function (text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  });
}

export function prefix(id: string, itemType: ItemType) {
  return `${Item[itemType]}:${id}`;
}

export function stripPrefix(id: string) {
  return id.split(":")[1];
}

export function isValidEmail(text: string) {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,}$/;
  return emailRegex.test(text);
}

export function isValidParentDomain(text: string) {
  const domainRegex = /^(?:[a-zA-Z0-9-]{1,}\.){1,}[a-zA-Z0-9]{2,}$/;
  return domainRegex.test(text);
}
