import { get } from "svelte/store";

import { appStore } from "@nucleum/shared-state/app-context/app.store";
import { accountSession } from "@nucleum/surfaces/account/account-session";

import { LogType } from "@nucleum/client/runtime/logging/log.type";
import { logger } from "@nucleum/client/runtime/logging/logger";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";

import { normalizeEnvForComparison } from "@nucleum/client/runtime/launch-context";
/** Signs out when persisted account authority belongs to another environment. */
export async function checkForEnvironmentChange() {
  const envCachedOnMachine = await clientStorage.get(ClientStorageKey.ENV);
  if (envCachedOnMachine === null) {
    clientStorage.set(ClientStorageKey.ENV, get(appStore).env);
    return;
  }
  const cachedEnv = normalizeEnvForComparison(envCachedOnMachine);
  const currentEnv = normalizeEnvForComparison(get(appStore).env);
  if (envCachedOnMachine && currentEnv !== cachedEnv) {
    clientStorage.set(ClientStorageKey.ENV, get(appStore).env);
    logger.log(
      {
        at: "checkForEnvironmentChange",
        message: "Environment changed. Signing out user.",
        envCachedOnMachine,
        env: get(appStore).env
      },
      LogType.INFO
    );
    await accountSession.signOut();
    return;
  }
  if (envCachedOnMachine !== get(appStore).env) {
    clientStorage.set(ClientStorageKey.ENV, get(appStore).env);
  }
}
