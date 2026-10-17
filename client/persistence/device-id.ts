import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { generateSimpleRandomId } from "@21n/shared-utils/crypto.utils";
import { clientStorage } from "@nucleum/persistence/client-storage";

let dapIdPromise: Promise<string> | null = null;

/** Returns the durable device application profile identifier. */
export async function getDapId() {
  dapIdPromise ??= resolveDapId().finally(() => {
    dapIdPromise = null;
  });
  return dapIdPromise;
}

async function resolveDapId() {
  const dapId = await clientStorage.get(ClientStorageKey.DAP_ID);
  if (dapId) return dapId;
  const generatedDapId = generateSimpleRandomId();
  await clientStorage.set(ClientStorageKey.DAP_ID, generatedDapId);
  return generatedDapId;
}
