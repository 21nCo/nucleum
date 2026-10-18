import { performStaticDataOperation } from "@nucleum/client/runtime/network/static-data";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";

/** Remote operations for staticDataTransport; local persistence is owned separately. */
export const staticDataTransport = {
  /** Executes the existing fetchAppData transport operation. */
  fetchAppData: async (env: string) => {
    try {
      const product = await clientStorage.get(ClientStorageKey.PRODUCT);
      if (!product) return;
      let response = await performStaticDataOperation(`${product}/${env}.json`);
      if (response?.ok) {
        let jsonValue = await response.json();
        if (!jsonValue) return;
        return jsonValue;
      }
    } catch (err) {
      throw err;
    }
  }
};
