import type { IResource } from "@21n/data/datafn/resource.type";

export type QueryParams =
  | string
  | number
  | boolean
  | string[]
  | IResource
  | IResource[]
  | MergeRecord;

export type MergeRecord = Partial<IResource> & Required<Pick<IResource, "id">>;
