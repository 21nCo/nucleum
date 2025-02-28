import type { IRecordId } from "$lib/client/types/data.type";
import { generateRandomIdv2 } from "$lib/shared/utils/crypto.utils";
import { RecordId } from "surrealdb";
import type { Resource } from "./resourceStores/resource.enum";

export function generateResourceId(
  itemType: Resource,
  params?: {
    prefix?: string;
    id?: string;
    isAsString?: boolean;
  }
): IRecordId {
  const id = params?.id ?? generateRandomIdv2();
  if (!params?.isAsString) {
    return new RecordId(
      itemType,
      (params?.prefix ? params?.prefix + "_" : "") + id
    );
  }
  return `${itemType}:${params?.prefix ? params.prefix + "_" : ""}${id}`;
}
