import type {
  IResource,
  IResourseShareable,
  OmitForCaptureWithId
} from "$lib/client/components/flux/resourceStores/resource.type";
import type { AvatarWithCode, IconAvatar } from "$lib/client/types/avatar.type";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { ICollection } from "../collection.type";

/**
 * @deprecated Use IProperty instead
 */
export interface IPropertyv1 extends IResource, IResourseShareable {
  label: string;
  type: PropertyType;
  default?: boolean | string | number | string[];
  config?: IPropertyConfig;
  order: number;
  isShowOnNodePage?: boolean;
  isShowOnCapture?: boolean;
}

export type IProperty =
  | ISelectProperty
  | IUniversalProperty
  | IRatingProperty
  | IPropertyInterface<
      Exclude<
        PropertyType,
        | PropertyType.SINGLE_SELECT
        | PropertyType.MULTI_SELECT
        | PropertyType.UNIVERSAL
        | PropertyType.RATING
      >,
      IPropertyConfig
    >;

interface IPropertyInterface<TType = PropertyType, TConfig = IPropertyConfig>
  extends IResource,
    IResourseShareable {
  label: string;
  type: TType;
  config?: TConfig;
  default?: boolean | string | number | string[];
  isShowOnNodePage?: boolean;
  isShowOnCapture?: boolean;
}

export type ISelectPropertyConfig = {
  options?: IPropertyConfigOption[];
  groups?: IPropertyConfigOptionGroup[];
};
export type ISelectProperty = IPropertyInterface<
  PropertyType.SINGLE_SELECT | PropertyType.MULTI_SELECT,
  ISelectPropertyConfig
>;

export type IUniversalPropertyConfig = {
  type: UniversalPropertyType;
  isMultiSelect?: boolean;
};
export type IUniversalProperty = IPropertyInterface<
  PropertyType.UNIVERSAL,
  IUniversalPropertyConfig
>;

export type IRatingPropertyConfig = {
  /**
   * @deprecated Use avatar instead
   */
  ratingAvatar?: AvatarWithCode<IconAvatar>;
  avatar: string;
};
export type IRatingProperty = IPropertyInterface<
  PropertyType.RATING,
  IRatingPropertyConfig
>;

export type IPropertyConfigOption = {
  id: string;
  label: string;
  /**
   * For Icon select universal properties
   */
  icon?: string;
  color?: number;
  groupId?: string;
};

export type IPropertyConfigOptionGroup = {
  id: string;
  label: string;
};

export type IPropertyConfig =
  | ISelectPropertyConfig
  | IRatingPropertyConfig
  | IUniversalPropertyConfig;

export enum PropertyType {
  //Text
  TEXT = "text",
  NUMBER = "number",
  EMAIL = "email",
  URL = "url",

  //Select options
  SINGLE_SELECT = "single-select",
  MULTI_SELECT = "multi-select",
  UNIVERSAL = "universal",

  CHECKBOX = "checkbox",
  RATING = "rating",
  DATE = "date",
  RANGE = "range",
  LINK_LIST = "link-list",
  FILE = "file",

  // System properties
  CREATED_TIME = "created-time",
  MODIFIED_TIME = "modified-time",
  CREATED_BY = "created-by",
  MODIFIED_BY = "modified-by",
  LOCATION = "location",
  NUMBER_OF_VISITS = "number-of-visits",
  SYSTEM_ID = "system-id",

  //Auto properties
  FORMULA = "formula",
  AI_AUTOFILL = "ai-autofill",
  CUSTOM_ID = "custom-id",
  LINKS_COUNT = "links-count",

  //Detection properties
  COLORS = "colors",
  SCENE = "scene",

  //Integration properties
  TIME_TRACKING = "time-tracking",
  CALENDAR_EVENT = "calendar-event",
  GOAL = "goal",
  GIT = "git"
}

export enum UniversalPropertyType {
  NONE = "none",
  COUNTRY = "country",
  LANGUAGE = "language",
  CURRENCY = "currency",
  CONTINENT = "continent",
  TIMEZONE = "timezone",
  WEATHER = "weather",
  MOOD_LOG = "mood-log",
  REACTION = "reaction"
}

export const textPropertyTypes = [
  PropertyType.TEXT,
  PropertyType.NUMBER,
  PropertyType.EMAIL,
  PropertyType.URL
];
export const selectOptionsPropertyTypes = [
  PropertyType.SINGLE_SELECT,
  PropertyType.MULTI_SELECT,
  PropertyType.UNIVERSAL
];

export const propertyTypesWithUserConfiguration = [
  PropertyType.SINGLE_SELECT,
  PropertyType.MULTI_SELECT,
  PropertyType.RATING
];

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

export const iconSelectPropertyTypes = [
  UniversalPropertyType.WEATHER,
  UniversalPropertyType.MOOD_LOG,
  UniversalPropertyType.REACTION
];
