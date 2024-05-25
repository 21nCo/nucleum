import type {
  Avatar,
  AvatarWithCode,
  IconAvatar
} from "$lib/client/types/avatar.type";
import type { MemotronItemBase } from "./common.type";

type TypeBase = MemotronItemBase & {
  avatar: Avatar;
};
export type Type = TypeBase & {
  properties: Property[];
};

export type ActiveTypeStore = Type;

export type TypeCreationForm = {
  label: string;
  avatar: string;
  properties: Property[];
};

export type Property = {
  id: string;
  label: string;
  type: PropertyType;
  default?: boolean | string | number | string[];
  config?: PropertyConfig;
  order: number;
  isShowOnNodePage?: boolean;
  isShowOnCapture?: boolean;
};

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
  order: number;
};

export type PropertyConfigOptionGroup = {
  id: string;
  label: string;
  color: string;
  order: number;
};

export enum PropertyType {
  TEXT = "text",
  NUMBER = "number",
  CHECKBOX = "checkbox",
  RATING = "rating",
  DATE = "date",
  RANGE = "range",
  SINGLE_SELECT = "single-select",
  MULTI_SELECT = "multi-select",
  FILE = "file",
  CREATED_TIME = "created-time",
  MODIFIED_TIME = "modified-time",
  CREATED_BY = "created-by",
  MODIFIED_BY = "modified-by",
  LOCATION = "location"
}

export type TypeLocalRecord = TypeBase;

export type PropertyValue =
  | string
  | string[]
  | number
  | Date
  | boolean
  | { start: Date; end: Date };
