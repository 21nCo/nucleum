import type { JsonValue } from "$lib/client/types/json.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import account from "../stores/account.store";

export function resetLocalStorage() {
  if (import.meta.env?.SSR || !import.meta.env || !window?.localStorage) {
    return;
  }
  window?.localStorage.clear();
  window?.location.reload();
}

export function persistLocally<T extends JsonValue>(
  itemType: Resource,
  item: T
) {
  if (import.meta.env?.SSR || !import.meta.env) {
    return;
  }
  window?.localStorage.setItem(Resource[itemType], JSON.stringify(item));
}
export function retrieveLocally(itemType: Resource) {
  try {
    if (import.meta.env?.SSR || !import.meta.env) {
      return null;
    }
    let value = window?.localStorage.getItem(Resource[itemType]);
    if (value) {
      return JSON.parse(value);
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

/**
   * Used to upload a file to s3 temp bucket
   * @param input the file that needs to be uploaded to the S3 temp bucket
   */
export async function tempUploadToS3(input: any) {
  let itemLocalURL = new Blob([input], { type: input.type });
  let customName = input.name.split(".")[0].trim();
  const result = await account.uploadFile(
    input.type,
    customName,
    itemLocalURL,
    true
  );
  let url = result.uploadURL.split("?")[0];
  return [url, customName, itemLocalURL];
}