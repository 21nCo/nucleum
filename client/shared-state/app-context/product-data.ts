import { appStore } from "@nucleum/shared-state/app-context/app.store";

import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";

import { parse } from "@21n/shared-utils/json.utils";

/** Loads the newest cached or bundled metadata, applying the composing product identity. */
export async function loadInitialProductData(
  dynamicProductData: any,
  details: { name: string; version: string; build: number }
) {
  const cachedAppData = await clientStorage.get(ClientStorageKey.APP_DATA);
  const cachedAppDataJson = parse(cachedAppData ?? "{}");

  let data =
    cachedAppDataJson &&
    cachedAppDataJson?.dataVersion >= dynamicProductData?.dataVersion
      ? {
          ...cachedAppDataJson
        }
      : {
          ...dynamicProductData
        };
  data = {
    ...data,
    name: details.name,
    version: details.version,
    build: details.build
  };
  appStore.loadAppData(data, {
    isDefaultData: true
  });
}
