import type { IResource } from "@21n/components/flux/resourceStores/resource.type";

export type QueryParams =
  | string
  | number
  | boolean
  | string[]
  | IResource
  | IResource[]
  | MergeRecord;

export type MergeRecord = Partial<IResource> & Required<Pick<IResource, "id">>;
