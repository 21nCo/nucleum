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

export const autoPropertiesGroupLabel = "Automatic";
export const metaPropertyOptions = [
  {
    label: "Created time",
    icon: "ph:clock-light",
    value: PropertyType.CREATED_TIME,
    groupId: autoPropertiesGroupLabel
  },
  {
    label: "Modified time",
    icon: "ph:clock-light",
    value: PropertyType.MODIFIED_TIME,
    groupId: autoPropertiesGroupLabel
  },
  {
    label: "Location",
    icon: "ph:map-pin-light",
    value: PropertyType.LOCATION,
    groupId: autoPropertiesGroupLabel
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
    label: "Simple text",
    icon: "ph:text-light",
    value: PropertyType.TEXT,
    groupId: "text"
  },
  {
    label: "Number",
    icon: "ph:hash-light",
    value: PropertyType.NUMBER,
    groupId: "text"
  },
  {
    label: "Email",
    icon: "ph:envelope-light",
    value: PropertyType.EMAIL,
    groupId: "text"
  },
  {
    label: "Link",
    icon: "ph:link-light",
    value: PropertyType.URL,
    groupId: "text"
  },
  {
    label: "Single select",
    icon: "ph:caret-circle-down-light",
    value: PropertyType.SINGLE_SELECT,
    groupId: "options"
  },
  {
    label: "Multi select",
    icon: "ph:list-bullets-light",
    value: PropertyType.MULTI_SELECT,
    groupId: "options",
    badge: "New"
  },
  {
    label: "Universal select",
    icon: "ph:globe-light",
    value: PropertyType.UNIVERSAL,
    groupId: "options",
    badge: "New"
  },
  {
    label: "Rating",
    icon: "star",
    value: PropertyType.RATING,
    groupId: "wizard"
  },
  {
    label: "Date",
    icon: "calendar",
    value: PropertyType.DATE,
    groupId: "wizard"
  },
  {
    label: "Checkbox",
    icon: "ph:check-square-offset-light",
    value: PropertyType.CHECKBOX,
    groupId: "wizard"
  },
  {
    label: "Time tracking",
    icon: "ph:timer-light",
    value: PropertyType.TIME_TRACKING,
    badge: "Planned",
    isDisabled: true,
    groupId: "wizard"
  },
  {
    label: "Link list",
    icon: "ph:tree-view-light",
    value: PropertyType.LINK_LIST,
    badge: "Planned",
    isDisabled: true,
    groupId: "wizard"
  },
  {
    label: "Attachement(s)",
    icon: "upload",
    value: PropertyType.FILE,
    badge: "Planned",
    isDisabled: true,
    groupId: "wizard"
  },
  {
    label: "Formula",
    icon: "ph:math-operations-light",
    value: PropertyType.FORMULA,
    badge: "Planned",
    isDisabled: true,
    groupId: "wizard"
  }
];
