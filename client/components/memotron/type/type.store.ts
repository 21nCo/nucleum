import {
  PropertyType,
  type ActiveTypeStore,
  type TypeCreationForm
} from "$lib/client/types/memotron/type.type";
import account from "$lib/client/stores/account.store";
import { dataManager } from "$lib/client/stores/data.store";
import {
  StoreDataType,
  type ICacheableStore,
  PersistanceActionType
} from "$lib/client/types/data.type";
import { Item } from "$lib/client/types/item.enum";
import { prefixTable } from "$lib/client/utils/text.utils";
import { generateUID } from "$lib/client/utils/utils";
import { get, writable } from "svelte/store";
type TypeStore = ICacheableStore;

const seedTypeStore: TypeStore = {
  id: Item.type,
  refreshQuery: "return fn::memotron::type::fetch();",
  dataType: StoreDataType.IFR,
  priorityRefreshOnAppAppear: true,
  dependencies: [],
  mutatingResources: [Item.type]
};
/**
 *
 * Store for handling mutations on type resource.
 * Fetching will be directly done accessing dexie store.
 */
export const types = initTypeStore();

function initTypeStore() {
  const { subscribe, set, update } = writable<TypeStore>(seedTypeStore);
  return {
    subscribe,
    set,
    update,
    refresh: () => {
      return dataManager.refreshForIFR(Item.type);
    },
    create: async (form: TypeCreationForm) => {
      console.log("creating type", { form });
      const type = {
        label: form.label,
        avatar: form.avatar,
        id: prefixTable(generateUID(), Item.type),
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        createdBy: get(account)?.userInfo?.id ?? "",
        modifiedBy: get(account)?.userInfo?.id ?? "",
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
        PersistanceActionType.CUSTOM_QUERY,
        "return fn::memotron::type::create($type, $properties);",
        true
      );
    },
    modify: () => {
      //delegated from active type individual stores or type edit form
    },
    delete: (id: string) => {
      return dataManager.performMutationForIFR(
        Item.type,
        PersistanceActionType.DELETE,
        { id }
      );
    }
  };
}

export type ActiveTypeStoreType = ReturnType<typeof initActiveTypeStore>;

/**
 * Type stores map for holding the state of active i.e. currently open types in the UI
 */
const activeTypeStores = new Map<string, ActiveTypeStoreType>();

/**
 * Resolves the active type store for the given id. If the store does not exist, it will be initialized.
 * @param id - The id of the type
 * @param context - The context from which the store is being accessed. This is used for debugging purposes.
 * @returns The active type store
 */
export function resolveActiveTypeStore(id: string, context: string = "") {
  if (!activeTypeStores.has(id)) {
    activeTypeStores.set(id, initActiveTypeStore());
  }
  let val = activeTypeStores.get(id);
  return val!;
}

/**
 * Initializes the active type store. This store will hold the state of the active type in the UI.
 * @returns The active type store
 */
function initActiveTypeStore() {
  const { subscribe, set, update } = writable<ActiveTypeStore>();
  return {
    subscribe,
    set,
    update
  };
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
