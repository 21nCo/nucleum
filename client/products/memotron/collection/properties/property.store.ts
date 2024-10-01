import { ResourceStore } from "$lib/client/components/flux/resourceStores/resource.store";
import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
import {
  type IProperty,
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

export class PropertyEditorStore extends ObservableStore<
  OmitForCaptureWithId<IProperty>[] & IObservableStoreSubject
> {
  constructor() {
    super("propertyEditor");
    this.set([]);
  }
  load(data: IProperty[]) {
    this.set(data);
  }
  reset() {
    this.set([]);
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
    badge: "Planned"
  },
  {
    label: "Link list",
    icon: "ph:tree-view-light",
    value: PropertyType.LINK_LIST,
    badge: "Planned"
  },
  {
    label: "Attachement(s)",
    icon: "upload",
    value: PropertyType.FILE,
    badge: "Planned"
  }
];
