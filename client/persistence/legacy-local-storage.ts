import type { JsonValue } from "@nucleum/persistence/json.type";
import { Resource } from "@nucleum/schema/resource.enum";
import { parse, stringify } from "@21n/shared-utils/json.utils";
import { getBrowserStorage } from "@nucleum/persistence/client-storage";

/** Writes legacy product state to browser local storage. */
export function persistLocally<T extends JsonValue>(
  itemType: Resource,
  item: T
) {
  if (import.meta.env?.SSR || !import.meta.env) {
    return;
  }
  getBrowserStorage("localStorage")?.setItem(
    Resource[itemType],
    stringify(item)
  );
}
/** Reads legacy product state from browser local storage. */
export function retrieveLocally(itemType: Resource) {
  try {
    if (import.meta.env?.SSR || !import.meta.env) {
      return null;
    }
    let value = getBrowserStorage("localStorage")?.getItem(Resource[itemType]);
    if (value) {
      return parse(value);
    } else {
      return null;
    }
  } catch {
    return null;
  }
}
