import { get, writable } from "svelte/store";
import { dataManager } from "$lib/client/persistence/dataManager";
import { Item } from "../types/item.enum";
import { StoreDataType } from "../types/data.type";
import type { Space, SpaceStore } from "../types/space.type";
import { performApiCall } from "$lib/client/utils/network.utils";
import { retrieveLocally } from "../utils/storage.utils";

const cachedSpaceInContext = retrieveLocally(Item.spaceInContext);
export const spaceInContext = writable<Space>(cachedSpaceInContext ?? null);

const seedSpaceStore = {
  id: Item.space,
  dataType: StoreDataType.FIR,
  mutatingResources: [Item.space],
  refreshOnAppAppear: true,
  spaces: []
};
export const spaceStore = initSpaceStore();
function initSpaceStore() {
  const { subscribe, set, update } = writable<SpaceStore>();
  dataManager.retrieveCache(Item.space).then((m) => {
    if (!m) {
      set(seedSpaceStore);
    } else {
      set(m);
    }
  });
  const cache = async (n: SpaceStore) => {
    dataManager.cache({
      ...seedSpaceStore,
      spaces: n.spaces
    } as SpaceStore);
  };
  return {
    subscribe,
    set,
    update,
    refresh: async () => {
      const response = await performApiCall("space/n/action", "POST", {
        action: "get_all"
      });
      console.log({ response });
      if (response?.ok) {
        const data = await response.json();
        console.log({ data });
        update((n) => {
          n.spaces = data.map(
            (x: { role: string; details: any; id: string }) => {
              //TODO - replace name with label on db
              return { ...x.details, role: x.role, id: x.id };
            }
          );
          cache(n);
          return n;
        });
      }
    },
    switchToSpace: async (space: Space) => {
      //TODO - loading - switching
      const response = await performApiCall("space/n/action", "POST", {
        action: "switch",
        id: space.id
      });
      if (response?.ok) {
        const data = await response.json();
        console.log("switch response:", { data });
        if (data.id && data.token) {
          localStorage.setItem("token-" + data.id, data.token);
        }
        spaceInContext.set(space);
        localStorage.setItem(Item.spaceInContext, JSON.stringify(space));
        //modalEvent.hideSpecific(GatheryEvent.SPACE_BROWSER);
      }
    }
  };
}
