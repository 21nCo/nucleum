import { writable } from "svelte/store";
import type { JsonValue } from "$lib/client/types/json.type";

export const icloudStore = <T extends JsonValue>(initial: T) => {
  const { subscribe, set, update } = writable<T>(initial);

  return {
    subscribe,
    set,
    update
  };
};
