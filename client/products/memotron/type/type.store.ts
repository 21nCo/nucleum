import {
  PropertyType,
  type IActiveTypeStore,
  type TypeCreationForm
} from "$lib/client/types/memotron/type.type";
import { dataManager } from "$lib/client/persistence/dataManager";
import {
  PersistanceActionType
} from "$lib/client/types/data.type";
import { Item } from "$lib/client/types/item.enum";
import { prefixTable } from "$lib/client/utils/text.utils";
import { generateUID } from "$lib/client/utils/utils";
import { get } from "svelte/store";
import { ActiveResourceStore, ResourceStore } from "$lib/client/stores/resource.store";
import type { ISurrealDatabase } from "$lib/client/types/db.type";
import { SurrealDatabase } from "$lib/client/persistence/surrealHelper";


class TypeStore extends ResourceStore {
  db: ISurrealDatabase
  constructor() {
    super(Item.type, {
      priorityRefreshOnAppAppear: true,
      refreshQuery: "return fn::memotron::type::fetch();",
    });
    this.db = new SurrealDatabase();
  }
  async create(form: TypeCreationForm) {
    console.log("creating type", { form });
    const type = {
      label: form.label,
      avatar: form.avatar,
      id: prefixTable(generateUID(), Item.type),
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      createdBy: this.currentUserId,
      modifiedBy: this.currentUserId,
      isArchived: false
    };
    const properties = form.properties.map((prop) => {
      return {
        ...prop,
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      };
    });
    const dm = get(dataManager);
    dm.cacheSource.dexie.type.add(type);
    //TODO - add properties to properties dexie??
    //TODO - add $mutatedAt to definition
    return dataManager.performMutation(
      Item.type,
      { type, properties },
      {
        action: PersistanceActionType.CUSTOM_QUERY,
        query: "return fn::memotron::type::create($type, $properties);",
        isMutatingSelfOnly: true
      }
    );
  }
}

export const typeStore = new TypeStore();

export type IActiveTypeStoreType = InstanceType<typeof ActiveTypeStore>;

/**
 * Type stores map for holding the state of active i.e. currently open types in the UI
 */
const activeTypeStores = new Map<string, IActiveTypeStoreType>();

/**
 * Resolves the active type store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the type
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active type store
 */
export function resolveActiveTypeStore(id: string, context: string = "") {
  if (!activeTypeStores.has(id)) {
    activeTypeStores.set(id, new ActiveTypeStore(id));
  }
  let val = activeTypeStores.get(id);
  return val!;
}


class ActiveTypeStore extends ActiveResourceStore<IActiveTypeStore, TypeStore> {
  constructor(id: string) {
    super(id, typeStore);
  }
}


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
