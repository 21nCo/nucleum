import type { Product } from "@nucleum/client/config/product.type";
import type { UserAccount } from "@nucleum/client/runtime/account/account.type";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { datafnE2eeState } from "@nucleum/datafn/datafnE2ee.store";
import { get } from "svelte/store";

const datafnOfflinabilityDefault = true;

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

/** Reads the persisted offline storage preference. */
export async function resolveDatafnOfflinabilityPreference() {
  if (typeof window === "undefined" && typeof chrome === "undefined") {
    return datafnOfflinabilityDefault;
  }
  const value = await clientStorage.get(ClientStorageKey.DATAFN_OFFLINABILITY);
  if (value === null) return datafnOfflinabilityDefault;
  return value !== "false";
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
