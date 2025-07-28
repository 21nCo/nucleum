import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  type IProperty,
  type IPropertyCapture,
  type IPropertyEditorStore,
  PropertyType,
  UniversalPropertyType
} from "$lib/client/components/collection/properties/property.type";
import { ObservableStore } from "$lib/client/stores/client.store";
import { StoreDataType } from "$lib/client/types/data.type";
import { PropertyTypeGroup } from "./propertyTypeSelector/propertyTypeSelector.type";

class PropertyStore extends ResourceStore<IProperty, IPropertyCapture> {
  constructor() {
    super(Resource.property, {
      dataType: StoreDataType.FIR
    });
  }
}

export const propertyStore = new PropertyStore();

export class PropertyEditorStore extends ObservableStore<IPropertyEditorStore> {
  constructor() {
    super("propertyEditor");
    this.set({ properties: [] });
  }
  load(data: IProperty[]) {
    this.set({ properties: data });
  }
  reset() {
    this.set({ properties: [] });
  }
}

export const propertyEditorStore = new PropertyEditorStore();

export const autoPropertyOptions = [
  {
    label: "Created time",
    icon: "clock",
    value: PropertyType.CREATED_TIME,
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "Modified time",
    icon: "clock",
    value: PropertyType.MODIFIED_TIME,
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "Location",
    icon: "map-pin",
    value: PropertyType.LOCATION,
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "System ID",
    icon: "hash",
    value: PropertyType.SYSTEM_ID,
    groupId: PropertyTypeGroup.SYSTEM
  },
  // {
  //   label: "Number of visits",
  //   icon: "hash",
  //   value: PropertyType.NUMBER_OF_VISITS,
  //   groupId: PropertyTypeGroup.SYSTEM,
  //   badge: "Planned",
  //   isDisabled: true
  // },
  {
    label: "Calendar events",
    icon: "calendar",
    value: PropertyType.CALENDAR_EVENT,
    isDisabled: true,
    badge: "Planned",
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "Links count",
    icon: "link",
    value: PropertyType.LINKS_COUNT,
    isDisabled: true,
    badge: "Planned",
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "Formula",
    icon: "math-operations",
    value: PropertyType.FORMULA,
    isDisabled: true,
    groupId: PropertyTypeGroup.RULE_BASED
  },
  {
    label: "Custom ID",
    icon: "hash",
    value: PropertyType.CUSTOM_ID,
    isDisabled: true,
    groupId: PropertyTypeGroup.RULE_BASED
  },
  {
    label: "AI autofill",
    icon: "magic-wand",
    value: PropertyType.AI_AUTOFILL,
    isDisabled: true,
    groupId: PropertyTypeGroup.RULE_BASED
  },
  {
    label: "Colors",
    icon: "palette",
    value: PropertyType.COLORS,
    groupId: PropertyTypeGroup.DETECTION,
    tooltip: "Detects colors from an image node."
  },
  {
    label: "Scene",
    icon: "image",
    value: PropertyType.SCENE,
    isDisabled: true,
    badge: "Planned",
    groupId: PropertyTypeGroup.DETECTION
  },
  {
    label: "Time tracking [Pointron]",
    icon: "timer",
    value: PropertyType.TIME_TRACKING,
    isDisabled: true,
    groupId: PropertyTypeGroup.INTEGRATION
  },
  {
    label: "Goal [Pointron]",
    icon: "target",
    value: PropertyType.GOAL,
    isDisabled: true,
    groupId: PropertyTypeGroup.INTEGRATION
  },
  {
    label: "Git",
    icon: "git-branch",
    value: PropertyType.GIT,
    isDisabled: true,
    groupId: PropertyTypeGroup.INTEGRATION
  }
];

export const universalPropertyOptions = [
  {
    label: "Weather",
    icon: "cloud-sun",
    value: UniversalPropertyType.WEATHER
  },
  {
    label: "Mood log",
    icon: "smiley",
    value: UniversalPropertyType.MOOD_LOG
  },
  {
    label: "Reaction",
    icon: "thumbs-up",
    value: UniversalPropertyType.REACTION
  },
  {
    label: "Country",
    icon: "ph:globe-light",
    value: UniversalPropertyType.COUNTRY
  },
  {
    label: "Language",
    icon: "globe",
    value: UniversalPropertyType.LANGUAGE
  },
  {
    label: "Currency",
    icon: "currency-dollar",
    value: UniversalPropertyType.CURRENCY
  },
  {
    label: "Continent",
    icon: "globe",
    value: UniversalPropertyType.CONTINENT
  },
  {
    label: "Timezone",
    icon: "clock",
    value: UniversalPropertyType.TIMEZONE
  },
  {
    label: "Day of week",
    icon: "calendar",
    value: UniversalPropertyType.DAY_OF_WEEK
  },
  {
    label: "Month",
    icon: "calendar",
    value: UniversalPropertyType.MONTH
  }
];

export const propertyOptions = [
  {
    label: "Text",
    icon: "text",
    value: PropertyType.TEXT,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Number",
    icon: "hash",
    value: PropertyType.NUMBER,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Email",
    icon: "envelope",
    value: PropertyType.EMAIL,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Link",
    icon: "link",
    value: PropertyType.URL,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Single select",
    icon: "caret-circle-down",
    value: PropertyType.SINGLE_SELECT,
    groupId: PropertyTypeGroup.SELECT
  },
  {
    label: "Multi select",
    icon: "list",
    value: PropertyType.MULTI_SELECT,
    groupId: PropertyTypeGroup.SELECT
  },
  {
    label: "Universal select",
    icon: "globe",
    value: PropertyType.UNIVERSAL,
    groupId: PropertyTypeGroup.SELECT
  },
  {
    label: "Rating",
    icon: "star",
    value: PropertyType.RATING,
    groupId: PropertyTypeGroup.WIZARD
  },
  {
    label: "Date",
    icon: "calendar",
    value: PropertyType.DATE,
    groupId: PropertyTypeGroup.WIZARD
  },
  {
    label: "Checkbox",
    icon: "check-square-offset",
    value: PropertyType.CHECKBOX,
    groupId: PropertyTypeGroup.WIZARD
  },
  {
    label: "Link list",
    icon: "tree-view",
    value: PropertyType.LINK_LIST,
    badge: "Planned",
    isDisabled: true,
    groupId: PropertyTypeGroup.WIZARD
  },
  {
    label: "Attachement(s)",
    icon: "upload",
    value: PropertyType.FILE,
    badge: "Planned",
    isDisabled: true,
    groupId: PropertyTypeGroup.WIZARD
  }
];
