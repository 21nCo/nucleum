import {
  UserDataMode,
  type UserAccount
} from "@nucleum/client/runtime/account/account.type";

/** Returns whether a cloud account is currently operating offline. */
export function isCloudUserAndOffline(
  account: UserAccount,
  isInOfflineMode: boolean | undefined
) {
  return account.dataMode === UserDataMode.CLOUD && Boolean(isInOfflineMode);
}

/** Returns whether a cloud account is currently operating online. */
export function isCloudUserAndOnline(
  account: UserAccount,
  isInOfflineMode: boolean | undefined
) {
  return account.dataMode === UserDataMode.CLOUD && !isInOfflineMode;
}
