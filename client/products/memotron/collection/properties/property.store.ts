import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  type IProperty,
  type IPropertyEditorStore,
  PropertyType
} from "$lib/client/products/memotron/collection/properties/property.type";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";
import type { OmitForCaptureWithId } from "$lib/client/components/flux/resourceStores/resource.type";

class PropertyStore extends ResourceStore<IProperty> {
  constructor() {
    super(Resource.property);
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

export const universalPropertyGroupLabel = "Universal";
export const universalPropertyOptions = [
  {
    label: "Country",
    icon: "ph:globe-light",
    value: PropertyType.COUNTRY,
    groupId: universalPropertyGroupLabel,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Language",
    icon: "ph:translate-light",
    value: PropertyType.LANGUAGE,
    groupId: universalPropertyGroupLabel,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Currency",
    icon: "ph:money-light",
    value: PropertyType.CURRENCY,
    groupId: universalPropertyGroupLabel,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Continent",
    icon: "ph:map-trifold-light",
    value: PropertyType.CONTINENT,
    groupId: universalPropertyGroupLabel,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Timezone",
    icon: "ph:clock-light",
    value: PropertyType.TIMEZONE,
    groupId: universalPropertyGroupLabel,
    badge: "Planned",
    isDisabled: true
  }
];
export const propertyOptions = [
  {
    label: "Text",
    icon: "ph:text-light",
    value: PropertyType.TEXT
  },
  {
    label: "Number",
    icon: "ph:hash-light",
    value: PropertyType.NUMBER
  },

  {
    label: "Rating",
    icon: "star",
    value: PropertyType.RATING
  },
  {
    label: "Single select",
    icon: "chevdown",
    value: PropertyType.SINGLE_SELECT
  },
  {
    label: "Date",
    icon: "calendar",
    value: PropertyType.DATE
  },
  {
    label: "Checkbox",
    icon: "ph:check-square-offset-light",
    value: PropertyType.CHECKBOX
  },
  {
    label: "Email",
    icon: "ph:envelope-light",
    value: PropertyType.EMAIL
  },
  {
    label: "Link",
    icon: "ph:link-light",
    value: PropertyType.URL
  },
  {
    label: "Multi select",
    icon: "ph:list-bullets-light",
    value: PropertyType.MULTI_SELECT,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Time tracking",
    icon: "ph:timer-light",
    value: PropertyType.TIME_TRACKING,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Link list",
    icon: "ph:tree-view-light",
    value: PropertyType.LINK_LIST,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Attachement(s)",
    icon: "upload",
    value: PropertyType.FILE,
    badge: "Planned",
    isDisabled: true
  },
  {
    label: "Formula",
    icon: "ph:math-operations-light",
    value: PropertyType.FORMULA,
    badge: "Planned",
    isDisabled: true
  }
];
