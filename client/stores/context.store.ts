import { writable } from "svelte/store";
import { Embed, OperatingSystem, type Context } from "../types/context.type";

const context = initContextStore({
  isEmbed: false,
  isSheet: false,
  protocol: "",
  embed: Embed.NONE,
  os: OperatingSystem.MACOS,
  isTouchDevice: false
});

function initContextStore(val: Context) {
  const { subscribe, set, update } = writable<Context>(val);
  return {
    subscribe,
    set,
    update
  };
}

export default context;
