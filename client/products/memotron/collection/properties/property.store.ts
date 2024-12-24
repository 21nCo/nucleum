import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  type IProperty,
  type IPropertyEditorStore,
  PropertyType,
  UniversalPropertyType
} from "$lib/client/products/memotron/collection/properties/property.type";
import { ObservableStore } from "$lib/client/stores/client.store";
import {
  StoreDataType,
  type IObservableStoreSubject
} from "$lib/client/types/data.type";
import type { OmitForCaptureWithId } from "$lib/client/components/flux/resourceStores/resource.type";
import { PropertyTypeGroup } from "./propertyTypeSelector/propertyTypeSelector.type";

class PropertyStore extends ResourceStore<IProperty> {
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
    icon: "ph:clock-light",
    value: PropertyType.CREATED_TIME,
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "Modified time",
    icon: "ph:clock-light",
    value: PropertyType.MODIFIED_TIME,
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "Last opened time",
    icon: "ph:clock-light",
    value: PropertyType.LAST_OPENED_TIME,
    groupId: PropertyTypeGroup.SYSTEM
  },
  // {
  //   label: "Number of visits",
  //   icon: "ph:hash-light",
  //   value: PropertyType.NUMBER_OF_VISITS,
  //   groupId: PropertyTypeGroup.SYSTEM,
  //   badge: "Planned",
  //   isDisabled: true
  // },
  {
    label: "Location",
    icon: "ph:map-pin-light",
    value: PropertyType.LOCATION,
    groupId: PropertyTypeGroup.SYSTEM
  },
  {
    label: "Formula",
    icon: "ph:math-operations-light",
    value: PropertyType.FORMULA,
    isDisabled: true,
    groupId: PropertyTypeGroup.DEFAULT
  },
  {
    label: "Custom ID",
    icon: "ph:hash-light",
    value: PropertyType.CUSTOM_ID,
    isDisabled: true,
    groupId: PropertyTypeGroup.DEFAULT
  },
  {
    label: "Links count",
    icon: "ph:link-light",
    value: PropertyType.LINKS_COUNT,
    isDisabled: true,
    groupId: PropertyTypeGroup.DEFAULT
  },
  {
    label: "AI autofill",
    icon: "ph:magic-wand-light",
    value: PropertyType.AI_AUTOFILL,
    isDisabled: true,
    groupId: PropertyTypeGroup.DETECTION
  },
  {
    label: "Colors",
    icon: "ph:palette-light",
    value: PropertyType.COLORS,
    isDisabled: true,
    groupId: PropertyTypeGroup.DETECTION
  },
  {
    label: "Scene",
    icon: "ph:image-light",
    value: PropertyType.SCENE,
    isDisabled: true,
    groupId: PropertyTypeGroup.DETECTION
  },
  {
    label: "Time tracking [Pointron]",
    icon: "ph:timer-light",
    value: PropertyType.TIME_TRACKING,
    isDisabled: true,
    groupId: PropertyTypeGroup.INTEGRATION
  },
  {
    label: "Calendar event",
    icon: "ph:calendar-light",
    value: PropertyType.CALENDAR_EVENT,
    isDisabled: true,
    groupId: PropertyTypeGroup.INTEGRATION
  },
  {
    label: "Goal [Pointron]",
    icon: "ph:target-light",
    value: PropertyType.GOAL,
    isDisabled: true,
    groupId: PropertyTypeGroup.INTEGRATION
  },
  {
    label: "Git",
    icon: "ph:git-branch-light",
    value: PropertyType.GIT,
    isDisabled: true,
    groupId: PropertyTypeGroup.INTEGRATION
  }
];

export const universalPropertyOptions = [
  {
    label: "Weather",
    icon: "ph:cloud-sun-light",
    value: UniversalPropertyType.WEATHER
  },
  {
    label: "Mood log",
    icon: "ph:smiley-light",
    value: UniversalPropertyType.MOOD_LOG
  },
  {
    label: "Reaction",
    icon: "ph:thumbs-up-light",
    value: UniversalPropertyType.REACTION
  },
  {
    label: "Country",
    icon: "ph:globe-light",
    value: UniversalPropertyType.COUNTRY
  },
  {
    label: "Language",
    icon: "ph:translate-light",
    value: UniversalPropertyType.LANGUAGE
  },
  {
    label: "Currency",
    icon: "ph:money-light",
    value: UniversalPropertyType.CURRENCY
  },
  {
    label: "Continent",
    icon: "ph:map-trifold-light",
    value: UniversalPropertyType.CONTINENT
  },
  {
    label: "Timezone",
    icon: "ph:clock-light",
    value: UniversalPropertyType.TIMEZONE
  }
];

export const propertyOptions = [
  {
    label: "Text",
    icon: "ph:text-light",
    value: PropertyType.TEXT,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Number",
    icon: "ph:hash-light",
    value: PropertyType.NUMBER,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Email",
    icon: "ph:envelope-light",
    value: PropertyType.EMAIL,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Link",
    icon: "ph:link-light",
    value: PropertyType.URL,
    groupId: PropertyTypeGroup.TEXT
  },
  {
    label: "Single select",
    icon: "ph:caret-circle-down-light",
    value: PropertyType.SINGLE_SELECT,
    groupId: PropertyTypeGroup.SELECT
  },
  {
    label: "Multi select",
    icon: "ph:list-bullets-light",
    value: PropertyType.MULTI_SELECT,
    groupId: PropertyTypeGroup.SELECT,
    badge: "New"
  },
  {
    label: "Universal select",
    icon: "ph:globe-light",
    value: PropertyType.UNIVERSAL,
    groupId: PropertyTypeGroup.SELECT,
    badge: "New"
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
    icon: "ph:check-square-offset-light",
    value: PropertyType.CHECKBOX,
    groupId: PropertyTypeGroup.WIZARD
  },
  {
    label: "Link list",
    icon: "ph:tree-view-light",
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
