import { writable } from "svelte/store";
//logger is used everywhere - this should not have any dependencies other than on types
// import { appStore } from "./app.store";
// import { postToParent } from "$lib/client/utils/embed.utils";
import type { LogStore } from "../types/log.type";
import { StoreDataType } from "../types/data.type";

const seedLogStore: LogStore = {
  id: "debugLogs",
  dataType: StoreDataType.IFR,
  items: []
};

export const logger = initLogStore();
const propagate = async (log: any) => {
  try {
    await fetch("https://bla.ink/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(log)
    });
  } catch (err) {
    console.log(err);
  }
  // console.log(log);
  //BELOW -  causing circular dependency issue
  // const app = get(appStore);
  // (app.isDebugMode || app.isDebugEmbedMode) && console.log(log);
  // if (app.isDebugEmbedMode) {
  //   postToParent(log);
  // }
};
function initLogStore() {
  const { subscribe, set, update } = writable<LogStore>(seedLogStore);
  return {
    subscribe,
    set,
    update,
    log(message: string | object, type: "error" | "info" | "warn" = "info") {
      if (typeof message === "string") propagate({ message, type });
      else propagate({ ...message, type });
      update((n: LogStore) => {
        if (!n.items) n.items = [];
        n.items.push({
          message:
            typeof message === "string" ? message : JSON.stringify(message),
          type,
          timestamp: new Date().toLocaleTimeString()
        });
        return n;
      });
    },
    logError(message: any) {
      const type = "error";
      if (typeof message === "string") propagate({ message, type });
      else propagate({ ...message, type });
      update((n: LogStore) => {
        if (!n.items) n.items = [];
        n.items.push({
          message,
          type: "error",
          timestamp: new Date().toLocaleTimeString()
        });
        return n;
      });
    },
    clearDebugLogs() {
      update((n: LogStore) => {
        n.items = [];
        return n;
      });
    }
  };
}
