import { writable } from "svelte/store";
import {
  Embed,
  OperatingSystem,
  type IAppContext
} from "@21n/types/context.type";

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
    update
  };
}

export default context;
