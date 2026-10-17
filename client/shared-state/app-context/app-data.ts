import { get } from "svelte/store";

import { staticDataTransport } from "@nucleum/client/runtime/app-data/static-data-transport";

import { appStore } from "@nucleum/shared-state/app-context/app.store";

import { logger } from "@nucleum/client/runtime/logging/logger";

/** Refreshes persisted application metadata for the current environment. */
export async function refreshAppStaticData() {
  try {
    const appData = await staticDataTransport.fetchAppData(get(appStore).env);
    if (!appData) {
      throw new Error("App data not found");
    }
    appStore.loadAppData(appData);
  } catch (e) {
    logger.error({ at: "refreshAppStaticData", error: e });
  }
}
