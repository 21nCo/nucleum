import { writable } from "svelte/store";
import { Embed, OperatingSystem, type Context } from "../types/context.type";

const context = initViewStore({
  isEmbed: false,
  isSheet: false,
  embed: Embed.NONE,
  os: OperatingSystem.MAC
});

function initViewStore(val: Context) {
  const { subscribe, set, update } = writable<Context>(val);
  return {
    subscribe,
    set,
    update
  };
}

export default context;
