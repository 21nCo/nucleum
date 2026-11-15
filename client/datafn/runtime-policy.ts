import type { Product } from "@nucleum/client/config/product.type";
import type { UserAccount } from "@nucleum/client/runtime/account/account.type";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { datafnE2eeState } from "@nucleum/datafn/datafnE2ee.store";
import { get } from "svelte/store";

/**
 * New devices start in direct mode (no local copy), so the first sign-in
 * doesn't wait for a full download. Offline storage stays an opt-in setting.
 */
const datafnOfflinabilityDefault = false;

/** Describes local, synchronized, and direct remote DataFn modes. */
export type NucleumDatafnMode = "local-only" | "sync" | "sync-direct";

/** Inputs used to choose a product DataFn runtime. */
export type InitializeNucleumDatafnInput = {
  product: Product;
  account: Pick<UserAccount, "dataMode" | "userId" | "userInfo">;
  env?: string;
  appVersion?: string;
  dapId?: string;
  isOffline?: boolean;
  isOfflinabilityEnabled?: boolean;
};

/** Selects the account or guest namespace for local data. */
export function resolveDatafnNamespace(input: {
  account: Pick<UserAccount, "userId" | "userInfo">;
  dapId: string;
}) {
  const userId =
    input.account.userInfo?.id?.replace(/^user:/, "") ??
    input.account.userId?.replace(/^user:/, "");
  if (userId) return `user:${userId}`;
  return `guest:${input.dapId}`;
}

/** Chooses a DataFn mode from account and offline policy. */
export function resolveDatafnMode(input: InitializeNucleumDatafnInput) {
  const hasUserSpace = Boolean(
    input.account.userId || input.account.userInfo?.id
  );
  const isSyncEligible =
    hasUserSpace && input.account.dataMode !== UserDataMode.LOCAL;
  if (!isSyncEligible) return "local-only";
  if (input.isOfflinabilityEnabled === false) return "sync-direct";
  if (input.isOffline) return "local-only";
  return "sync";
}

/**
 * Reads the persisted offline storage preference.
 *
 * When none is saved yet and `storageDbName` is given, a device that already
 * holds that local copy keeps offline storage (its data may include changes
 * not yet synced); otherwise the default applies. That first decision is
 * saved so every later reader sees the same value.
 */
export async function resolveDatafnOfflinabilityPreference(input?: {
  storageDbName?: string | null;
}) {
  if (typeof window === "undefined" && typeof chrome === "undefined") {
    return datafnOfflinabilityDefault;
  }
  const value = await clientStorage.get(ClientStorageKey.DATAFN_OFFLINABILITY);
  if (value !== null) return value !== "false";
  if (!input?.storageDbName) return datafnOfflinabilityDefault;
  const isEnabled =
    (await hasIndexedDbDatabase(input.storageDbName)) ||
    datafnOfflinabilityDefault;
  await clientStorage.set(
    ClientStorageKey.DATAFN_OFFLINABILITY,
    isEnabled.toString()
  );
  return isEnabled;
}

/**
 * Whether an IndexedDB database exists. Treats an unknown answer (no
 * `indexedDB.databases()` support, or an error) as present, so existing
 * local data is never assumed absent.
 */
async function hasIndexedDbDatabase(name: string) {
  if (typeof indexedDB === "undefined") return false;
  if (typeof indexedDB.databases !== "function") return true;
  try {
    const databases = await indexedDB.databases();
    return databases.some((database) => database.name === name);
  } catch {
    return true;
  }
}

/** Persists offline storage policy while enforcing the E2EE requirement. */
export async function setDatafnOfflinabilityPreference(isEnabled: boolean) {
  if (!isEnabled && get(datafnE2eeState).enabled) {
    throw new Error("Offline storage is required while E2EE is enabled");
  }
  await clientStorage.set(
    ClientStorageKey.DATAFN_OFFLINABILITY,
    isEnabled.toString()
  );
  return isEnabled;
}
