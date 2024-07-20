import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";
import { ResourceStore } from "$lib/client/components/resourceStores/resource.store";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { Resource } from "$lib/client/components/resourceStores/resource.enum";
import {
  type IProperty,
  PropertyType
} from "$lib/client/products/memotron/collection/properties/property.type";
import { ObservableStore } from "$lib/client/stores/client.store";
import type { IObservableStoreSubject } from "$lib/client/types/data.type";

class PropertyStore extends ResourceStore<IProperty> {
  db: ISurrealDatabase;
  constructor() {
    super(Resource.property, {
      priorityRefreshOnAppAppear: true,
      refreshQuery: "return fn::memotron::property::fetchAll($since);"
    });
    this.db = new SurrealDatabase();
  }
}

export const propertyStore = new PropertyStore();

export class PropertyEditorStore extends ObservableStore<
  IProperty[] & IObservableStoreSubject
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
    icon: "clock",
    value: PropertyType.CREATED_TIME,
    groupId: autoPropertiesGroupLabel
  },
  {
    label: "Modified time",
    icon: "clock",
    value: PropertyType.MODIFIED_TIME,
    groupId: autoPropertiesGroupLabel
  },
  {
    label: "Location",
    icon: "map",
    value: PropertyType.LOCATION,
    groupId: autoPropertiesGroupLabel
  }
];
export const propertyOptions = [
  {
    label: "Text",
    icon: "bars",
    value: PropertyType.TEXT
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
    label: "Multi select",
    icon: "bars",
    value: PropertyType.MULTI_SELECT
  },
  {
    label: "Date",
    icon: "calendar",
    value: PropertyType.DATE
  },
  {
    label: "Checkbox",
    icon: "bolt",
    value: PropertyType.CHECKBOX
  },
  {
    label: "Attachement(s)",
    icon: "upload",
    value: PropertyType.FILE
  }
];
