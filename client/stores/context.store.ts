import { writable } from "svelte/store";
import {
  Embed,
  OperatingSystem,
  type IAppContext
} from "../types/context.type";
import { clientStorage } from "$lib/client/persistence/persistence.utils";
import { ClientStorageKey } from "$lib/client/persistence/persistence.type";

const context = initContextStore({
  isEmbed: false,
  isSheet: false,
  protocol: "",
  embed: Embed.NONE,
  os: OperatingSystem.MACOS,
  isTouchDevice: false,
  dapId: ""
});

function initContextStore(val: IAppContext) {
  const { subscribe, set, update } = writable<IAppContext>(val);
  return {
    subscribe,
    set,
    update,
    toggleOfflineMode: async (value: boolean) => {
      await clientStorage.set(ClientStorageKey.OFFLINE_MODE, value);
      update((ctx) => {
        return  {...ctx, isInOfflineMode: value }
      })  
    }
  };
}

export default context;
