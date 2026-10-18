import { navigation } from "@nucleum/shell/navigation/navigation";

import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";

import { postTokenToExtension } from "@nucleum/client/runtime/embed/embed.utils";

import { shouldUseAuthFnBearerSession } from "@nucleum/client/runtime/account/auth";

/** Completes the pending browser-extension login handoff after session validation. */
export async function completeExtensionLogin(): Promise<boolean> {
  const isLoginFromExtension = await clientStorage.getForSession(
    ClientStorageKey.IS_EXTENSION_LOGIN
  );
  if (isLoginFromExtension) {
    clientStorage.removeForSession(ClientStorageKey.IS_EXTENSION_LOGIN);
    const userInfo = await clientStorage.get(ClientStorageKey.USER_INFO);
    const token = shouldUseAuthFnBearerSession()
      ? await clientStorage.get(ClientStorageKey.AUTHFN_TOKEN)
      : undefined;
    postTokenToExtension({ token, userInfo });
    navigation.gotoPath("/ext/login");
    return true;
  }

  return false;
}
