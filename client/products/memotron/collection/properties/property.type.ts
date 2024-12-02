import type {
  IResource,
  IResourseShareable,
  OmitForCaptureWithId
} from "$lib/client/components/flux/resourceStores/resource.type";
import type { AvatarWithCode, IconAvatar } from "$lib/client/types/avatar.type";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { ICollection } from "../collection.type";

export interface IProperty extends IResource, IResourseShareable {
  label: string;
  type: PropertyType;
  default?: boolean | string | number | string[];
  config?: PropertyConfig;
  order: number;
  isShowOnNodePage?: boolean;
  isShowOnCapture?: boolean;
}

export type PropertyConfig = {
  options?: PropertyConfigOption[];
  groups?: PropertyConfigOptionGroup[];
  ratingAvatar?: AvatarWithCode<IconAvatar>;
};
export type PropertyConfigOption = {
  id: string;
  label: string;
  color?: number;
  groupId?: string;
};

export type PropertyConfigOptionGroup = {
  id: string;
  label: string;
};

export enum PropertyType {
  TEXT = "text",
  NUMBER = "number",
  EMAIL = "email",
  URL = "url",
  LINK_LIST = "link-list",
  CHECKBOX = "checkbox",
  RATING = "rating",
  DATE = "date",
  RANGE = "range",
  SINGLE_SELECT = "single-select",
  MULTI_SELECT = "multi-select",
  TIME_TRACKING = "time-tracking",
  FILE = "file",
  FORMULA = "formula",

  // Meta properties
  CREATED_TIME = "created-time",
  MODIFIED_TIME = "modified-time",
  CREATED_BY = "created-by",
  MODIFIED_BY = "modified-by",
  LOCATION = "location",

  // Universal properties
  COUNTRY = "country",
  LANGUAGE = "language",
  CURRENCY = "currency",
  CONTINENT = "continent",
  TIMEZONE = "timezone"
}

export type IPropertyValue =
  | string
  | string[]
  | number
  | Date
  | boolean
  | { start: Date; end: Date };

export type IPropertyEditorStore = IObservableStoreSubject & {
  properties: OmitForCaptureWithId<IProperty>[];
  typeToExtend?: ICollection;
};
