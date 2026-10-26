import { logger } from "@nucleum/client/runtime/logging/logger";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { goto } from "@nucleum/client/runtime/navigation/navigation-request";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { postDataToParent } from "@nucleum/client/runtime/embed/embed.utils";
import { EmbedDataMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";

/** Signs out remotely, clears scoped client storage, and optionally requests login navigation. */
export async function signout(
  params?: { isPreventDapIdClear?: boolean; isPreventRedirect?: boolean },
  ctx?: string
) {
  logger.log({ at: "signout", context: ctx, params });
  try {
    const { authClient } = await import("@nucleum/client/runtime/account/auth");
    await (
      await authClient()
    ).signOut({
      allSessions: false
    });
  } catch (error) {
    logger.error({ at: "authfn signout failed", error });
  }
  postDataToParent(EmbedDataMessage.ACCOUNT, {
    isLoggedIn: false
  });
  await clearLocalStorage(params);
  if (!params?.isPreventRedirect) goto("/account/login");
  async function clearLocalStorage(params?: { isPreventDapIdClear?: boolean }) {
    const env = await clientStorage.get(ClientStorageKey.ENV);
    const appData = await clientStorage.get(ClientStorageKey.APP_DATA);
    const product = await clientStorage.get(ClientStorageKey.PRODUCT);
    const dapId = params?.isPreventDapIdClear
      ? await clientStorage.get(ClientStorageKey.DAP_ID)
      : undefined;
    await clientStorage.clearAll();
    if (env) await clientStorage.set(ClientStorageKey.ENV, env);
    if (product) await clientStorage.set(ClientStorageKey.PRODUCT, product);
    if (appData) await clientStorage.set(ClientStorageKey.APP_DATA, appData);
    if (dapId) await clientStorage.set(ClientStorageKey.DAP_ID, dapId);
  }
}
