import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { isExtensionEnvironment } from "@21n/shared-utils/browser-environment";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { parse } from "@21n/shared-utils/json.utils";

/** Resolves the current bearer token for extension and native hosts. */
export async function resolveToken(): Promise<string | null> {
  let token: string | null = null;
  if (isExtensionEnvironment()) {
    return await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN);
  } else if (import.meta.env?.VITE_NATIVE_EMBED === "true") {
    const authFnToken = localStorage?.getItem(ClientStorageKey.AUTHFN_TOKEN);
    if (authFnToken) return authFnToken;
  }
  return token;
}

/** Reads the legacy cloud token without treating it as an AuthFn session. */
export async function resolveLegacyToken(): Promise<string | null> {
  if (isExtensionEnvironment()) {
    return await clientStorage.get(ClientStorageKey.STOKEN);
  }
  return typeof window !== "undefined"
    ? localStorage.getItem(ClientStorageKey.STOKEN)
    : null;
}

/** Checks whether a legacy cloud token is stored. */
export async function hasLegacyCloudSession(): Promise<boolean> {
  return Boolean(await resolveLegacyToken());
}

/** Reads the stored user identifier for the current host. */
export async function resolveCurrentUserId() {
  if (isExtensionEnvironment()) {
    const userInfo = await clientStorage.get(ClientStorageKey.USER_INFO);
    if (!userInfo) {
      return null;
    }
    return parse(userInfo)?.id ?? null;
  } else {
    const userInfo =
      typeof window !== "undefined"
        ? localStorage.getItem("userInfo")
        : undefined;
    if (userInfo) return parse(userInfo)?.id ?? null;
  }
  return null;
}

/** Preserves the legacy empty-token validity check. */
export function isTokenExpired(token: string) {
  return !token;
}
