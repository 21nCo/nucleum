import {
  createDatafnClient,
  type DatafnClient,
  type DatafnHttpTransportOptions,
  type DatafnSyncStatus,
  type DatafnStorageAdapter
} from "@datafn/client";
import {
  nucleumDatafnSchema,
  resolveNucleumDatafnSearchIndexVersion,
  type NucleumDatafnSchema
} from "@nucleum/schema";
import {
  resolveDatafnBootResources,
  resolveDatafnBackgroundResources
} from "@nucleum/datafn/resource-selection";
import {
  resolveDatafnNamespace,
  resolveDatafnMode,
  resolveDatafnOfflinabilityPreference,
  setDatafnOfflinabilityPreference,
  type InitializeNucleumDatafnInput,
  type NucleumDatafnMode
} from "@nucleum/datafn/runtime-policy";
import { resolveAccountBaseUrl } from "@nucleum/client/runtime/account/network";
import { createNucleumDatafnHttpOptions } from "@nucleum/datafn/remote-transport";
import type { Product } from "@nucleum/client/config/product.type";
import { ClientStorageKey } from "@nucleum/persistence/persistence.type";
import { clientStorage } from "@nucleum/persistence/client-storage";
import { getDapId } from "@nucleum/persistence/device-id";
import type { UserAccount } from "@nucleum/client/runtime/account/account.type";
import type { NucleumDatafnE2eeSettings } from "@nucleum/datafn/e2ee.type";
import { UserDataMode } from "@nucleum/client/runtime/account/account.type";
import { get, writable } from "svelte/store";
import { logger } from "@nucleum/client/runtime/logging/logger";
import {
  createDisabledDatafnE2eeSettings,
  createDatafnE2eeSetup,
  datafnE2eeState,
  disableLocalDatafnE2ee,
  getCachedDatafnE2eeProvider,
  getLocalDatafnE2eeSettings,
  persistDatafnE2eeSettings,
  rewrapCachedDatafnE2eeKey
} from "@nucleum/datafn/datafnE2ee.store";

import {
  type SearchProvider,
  createNucleumClientSearchProvider,
  disposeNucleumDatafnSearchProvider
} from "@nucleum/datafn/search-provider";
import { generateDatafnId } from "@nucleum/datafn/record-id";
import {
  readRemoteDatafnE2eeSettings,
  writeRemoteDatafnE2eeSettings,
  clearDatafnE2eeRecovery,
  resolveDatafnE2eeConfig
} from "@nucleum/datafn/encryption-settings";
import {
  deleteDatafnLocalClone,
  closeNucleumDatafnRuntimeStorage,
  createDatafnStorage,
  migrateDatafnNodeMdChildOrder,
  resolveDatafnStorageDbName
} from "@nucleum/datafn/storage-lifecycle";

export type NucleumDatafnStatus = DatafnSyncStatus & {
  namespace: string | null;
  storageDbName: string | null;
  product: Product | null;
  nucleumMode: NucleumDatafnMode | null;
  remoteUrl: string | null;
  bootResources: string[];
  backgroundResources: string[];
};

export type NucleumDatafnRuntime = {
  storage?: DatafnStorageAdapter;
  namespace: string;
  storageDbName: string | null;
  product: Product;
  mode: NucleumDatafnMode;
  remoteUrl: string | null;
  bootResources: string[];
  backgroundResources: string[];
  e2eeKeyRef?: string | null;
  destroy: () => Promise<void>;
};

const initialStatus: NucleumDatafnStatus = {
  status: "idle",
  mode: "local-only",
  phase: null,
  online: typeof navigator === "undefined" ? true : navigator.onLine,
  pendingChanges: 0,
  lastSyncAt: null,
  lastError: null,
  namespace: null,
  storageDbName: null,
  product: null,
  nucleumMode: null,
  remoteUrl: null,
  bootResources: [],
  backgroundResources: []
};

const runtimeStore = writable<NucleumDatafnRuntime | null>(null);

export const datafnRuntime = runtimeStore;

export const nucleumDatafnStatus = writable<NucleumDatafnStatus>(initialStatus);

let datafnSearchProvider: SearchProvider | undefined;

let lastInitializeInput: InitializeNucleumDatafnInput | null = null;

let datafnStatusUnsubscribe: (() => void) | null = null;

export const datafn: DatafnClient<NucleumDatafnSchema> = createDatafnClient({
  schema: nucleumDatafnSchema,
  clientId: "nucleum-bootstrap",
  searchProvider: datafnSearchProvider,
  searchIndexVersion: resolveNucleumDatafnSearchIndexVersion(),
  sync: { mode: "local-only" },
  temporal: { timezone: "user" },
  generateId: generateDatafnId
});

function resolveNucleumDatafnStatus(
  datafnStatus: DatafnSyncStatus,
  runtime: NucleumDatafnRuntime | null
): NucleumDatafnStatus {
  if (!runtime) return { ...initialStatus, ...datafnStatus };
  return {
    ...datafnStatus,
    namespace: runtime.namespace,
    storageDbName: runtime.storageDbName,
    product: runtime.product,
    nucleumMode: runtime.mode,
    remoteUrl: runtime.remoteUrl,
    bootResources: runtime.bootResources,
    backgroundResources: runtime.backgroundResources
  };
}

function bindNucleumDatafnStatus(runtime: NucleumDatafnRuntime) {
  datafnStatusUnsubscribe?.();
  datafnStatusUnsubscribe = datafn.sync.statusSignal().subscribe((status) => {
    nucleumDatafnStatus.set(resolveNucleumDatafnStatus(status, runtime));
  });
  nucleumDatafnStatus.set(
    resolveNucleumDatafnStatus(datafn.sync.getStatus(), runtime)
  );
}

function clearNucleumDatafnStatusBinding() {
  datafnStatusUnsubscribe?.();
  datafnStatusUnsubscribe = null;
}

function isSyncEligibleAccount(input: InitializeNucleumDatafnInput) {
  const hasUserSpace = Boolean(
    input.account.userId || input.account.userInfo?.id
  );
  return hasUserSpace && input.account.dataMode !== UserDataMode.LOCAL;
}

async function persistRemoteDatafnE2eeSettings(
  settings: NucleumDatafnE2eeSettings,
  context?: {
    clientId: string;
    namespace: string;
    remoteUrl: string;
    http: DatafnHttpTransportOptions;
    expectedSettings?: NucleumDatafnE2eeSettings | null;
  }
) {
  const runtime = get(runtimeStore);
  const remoteUrl = context?.remoteUrl ?? runtime?.remoteUrl;
  const namespace = context?.namespace ?? runtime?.namespace;
  if (!remoteUrl || !namespace) {
    throw new Error("DataFn remote is not available");
  }
  await writeRemoteDatafnE2eeSettings({
    settings,
    clientId: context?.clientId ?? (await getDapId()) ?? "unknown",
    namespace,
    remoteUrl,
    http: context?.http ?? (await createNucleumDatafnHttpOptions()),
    ...(context && "expectedSettings" in context
      ? { expectedSettings: context.expectedSettings }
      : {})
  });
}

export async function initializeNucleumDatafn(
  input: InitializeNucleumDatafnInput
): Promise<NucleumDatafnRuntime> {
  const existing = get(runtimeStore);
  const dapId = input.dapId ?? (await getDapId()) ?? "unknown";
  const namespace = resolveDatafnNamespace({ account: input.account, dapId });
  let isOfflinabilityEnabled =
    input.isOfflinabilityEnabled ??
    (await resolveDatafnOfflinabilityPreference());
  const syncEligible = isSyncEligibleAccount(input);
  const shouldConfigureRemote =
    syncEligible && (!input.isOffline || isOfflinabilityEnabled === false);
  const candidateRemoteUrl = shouldConfigureRemote
    ? await resolveDatafnRemoteUrl(input.account)
    : null;
  const candidateHttp = candidateRemoteUrl
    ? await createNucleumDatafnHttpOptions()
    : undefined;
  const hasRemoteSettingsAuthority = Boolean(
    candidateRemoteUrl && candidateHttp && !input.isOffline
  );
  let remoteE2eeSettings =
    hasRemoteSettingsAuthority && candidateRemoteUrl && candidateHttp
      ? await readRemoteDatafnE2eeSettings({
          dapId,
          namespace,
          remoteUrl: candidateRemoteUrl,
          http: candidateHttp
        })
      : null;
  const recoverySettings = await getLocalDatafnE2eeSettings(namespace);
  if (
    recoverySettings?.enabled &&
    recoverySettings.recoveryRequired === "restore-remote" &&
    hasRemoteSettingsAuthority &&
    candidateRemoteUrl &&
    candidateHttp
  ) {
    const restoredSettings = clearDatafnE2eeRecovery(recoverySettings);
    await persistRemoteDatafnE2eeSettings(restoredSettings, {
      clientId: dapId,
      namespace,
      remoteUrl: candidateRemoteUrl,
      http: candidateHttp,
      expectedSettings: remoteE2eeSettings
    });
    await persistDatafnE2eeSettings(namespace, restoredSettings);
    remoteE2eeSettings = restoredSettings;
  }
  const e2ee = await resolveDatafnE2eeConfig({
    namespace,
    remoteSettings: remoteE2eeSettings,
    hasRemoteSettingsAuthority
  });
  const isE2eeEnabled = e2ee.settings?.enabled === true;
  if (isE2eeEnabled && !isOfflinabilityEnabled) {
    await setDatafnOfflinabilityPreference(true);
    isOfflinabilityEnabled = true;
  }
  const effectiveInput = {
    ...input,
    isOfflinabilityEnabled
  };
  const mode = resolveDatafnMode(effectiveInput);
  const isStorageBacked = mode !== "sync-direct";
  const expectedStorageDbName = resolveDatafnStorageDbName({
    product: input.product,
    namespace,
    env: input.env
  });
  const storageDbName = isStorageBacked ? expectedStorageDbName : null;
  const retiredStorageDbName =
    mode === "sync-direct" && existing?.storageDbName === expectedStorageDbName
      ? existing.storageDbName
      : null;
  const runtimeKey = `${input.product}:${namespace}:${mode}:${storageDbName ?? "direct"}:${e2ee.settings?.keyRef ?? "no-e2ee"}`;

  if (
    existing &&
    `${existing.product}:${existing.namespace}:${existing.mode}:${existing.storageDbName ?? "direct"}:${existing.e2eeKeyRef ?? "no-e2ee"}` ===
      runtimeKey
  ) {
    await refreshNucleumDatafnStatus();
    lastInitializeInput = effectiveInput;
    return existing;
  }

  if (existing) {
    if (retiredStorageDbName) {
      await assertDatafnLocalCloneCanBeRetired(existing);
    }
    await existing.destroy();
    if (get(runtimeStore) === existing) {
      runtimeStore.set(null);
    }
  }

  const bootResources = resolveDatafnBootResources(input.product);
  const backgroundResources = resolveDatafnBackgroundResources(input.product);
  nucleumDatafnStatus.set({
    ...initialStatus,
    status: "starting",
    mode: mode === "local-only" ? "local-only" : "sync",
    namespace,
    storageDbName,
    product: input.product,
    nucleumMode: mode,
    bootResources,
    backgroundResources
  });

  const storageContext = isStorageBacked
    ? createDatafnStorage({
        product: input.product,
        namespace,
        env: input.env
      })
    : null;
  const storage = storageContext?.storage;
  await migrateDatafnNodeMdChildOrder(storage);
  const remoteUrl =
    mode === "sync" || mode === "sync-direct" ? candidateRemoteUrl : null;
  const http =
    mode === "sync" || mode === "sync-direct" ? candidateHttp : undefined;

  datafnSearchProvider = isStorageBacked
    ? createNucleumClientSearchProvider({
        dbName: `${storageDbName ?? runtimeKey}-search`
      })
    : undefined;
  await datafn.switchContext({
    clientId: dapId,
    searchProvider: datafnSearchProvider ?? null,
    searchIndexVersion: resolveNucleumDatafnSearchIndexVersion(),
    namespace,
    storage: storage ?? null,
    e2ee: e2ee.config ?? null,
    sync:
      mode === "sync"
        ? {
            mode,
            remote: remoteUrl as string,
            http,
            offlinability: true,
            crossTab: true,
            ws: false,
            hydration: {
              bootResources,
              backgroundResources,
              clonePageSize: 500
            }
          }
        : mode === "sync-direct"
          ? {
              mode: "sync",
              remote: remoteUrl as string,
              http,
              offlinability: false,
              crossTab: false,
              ws: false
            }
          : { mode }
  });
  if (retiredStorageDbName) {
    await deleteDatafnLocalClone(retiredStorageDbName);
  }
  let isDestroyed = false;

  const runtime: NucleumDatafnRuntime = {
    storage,
    namespace,
    storageDbName,
    product: input.product,
    mode,
    remoteUrl,
    bootResources,
    backgroundResources,
    e2eeKeyRef: e2ee.settings?.keyRef ?? null,
    destroy: async () => {
      if (isDestroyed) return;
      isDestroyed = true;
      if (get(runtimeStore) === runtime) {
        clearNucleumDatafnStatusBinding();
      }
      await flushNucleumDatafnMutations();
      stopNucleumDatafnSync();
      await closeNucleumDatafnRuntimeStorage(storage);
      const searchProvider = datafnSearchProvider;
      try {
        await disposeNucleumDatafnSearchProvider(searchProvider);
      } finally {
        if (datafnSearchProvider === searchProvider) {
          datafnSearchProvider = undefined;
        }
      }
    }
  };

  runtimeStore.set(runtime);
  bindNucleumDatafnStatus(runtime);
  await refreshNucleumDatafnStatus();
  lastInitializeInput = effectiveInput;
  return runtime;
}

let connectivityGeneration = 0;

let connectivityTransition = Promise.resolve<
  NucleumDatafnRuntime | null | undefined
>(undefined);

export async function destroyNucleumDatafn() {
  connectivityGeneration += 1;
  await connectivityTransition.catch(() => undefined);
  const existing = get(runtimeStore);
  if (!existing) return;
  try {
    await existing.destroy();
  } finally {
    if (get(runtimeStore) === existing) {
      runtimeStore.set(null);
    }
    clearNucleumDatafnStatusBinding();
    nucleumDatafnStatus.set(initialStatus);
  }
}

function requireLastInitializeInput() {
  if (!lastInitializeInput) {
    throw new Error("DataFn runtime is not initialized");
  }
  return lastInitializeInput;
}

export async function cloneUpAllDatafnData() {
  const runtime = get(runtimeStore);
  if (!runtime || runtime.mode !== "sync") {
    throw new Error("A synchronized DataFn runtime is required for clone-up");
  }
  await datafn.sync.cloneUp({
    recordOperation: "replace",
    clearChangelogOnSuccess: true,
    setGlobalCursorOnSuccess: true,
    pullAfter: false
  });
  await refreshNucleumDatafnStatus();
}

export async function enableNucleumDatafnE2ee(password: string) {
  const initInput = requireLastInitializeInput();
  const runtime = get(runtimeStore);
  if (!runtime) throw new Error("DataFn runtime is not initialized");
  if (runtime.mode === "sync-direct") {
    throw new Error("Enable offline storage before turning on E2EE");
  }
  const previousSettings = await getLocalDatafnE2eeSettings(runtime.namespace);
  const setup = await createDatafnE2eeSetup(password, runtime.namespace);
  try {
    await persistRemoteDatafnE2eeSettings(setup.settings);
    await initializeNucleumDatafn({
      ...initInput,
      isOfflinabilityEnabled: true
    });
    await cloneUpAllDatafnData();
  } catch (error) {
    const restoredSettings =
      previousSettings ?? createDisabledDatafnE2eeSettings();
    await persistRemoteDatafnE2eeSettings(restoredSettings).catch(
      (restoreError) => {
        logger.error({
          at: "datafn.e2ee.enable.restoreRemoteSettings",
          error: restoreError
        });
      }
    );
    await disableLocalDatafnE2ee(
      setup.settings,
      runtime.namespace,
      restoredSettings
    );
    await initializeNucleumDatafn(initInput).catch((restoreError) => {
      logger.error({
        at: "datafn.e2ee.enable.restoreRuntime",
        error: restoreError
      });
    });
    throw error;
  }
  datafnE2eeState.set({
    enabled: true,
    unlocked: true,
    keyRef: setup.settings.keyRef ?? null
  });
  return setup.settings;
}

export async function changeNucleumDatafnE2eePassword(password: string) {
  const runtime = get(runtimeStore);
  if (!runtime) throw new Error("DataFn runtime is not initialized");
  const settings = await getLocalDatafnE2eeSettings(runtime.namespace);
  if (!settings?.enabled) {
    throw new Error("E2EE is not enabled");
  }
  const next = await rewrapCachedDatafnE2eeKey(
    settings,
    password,
    runtime.namespace
  );
  try {
    await persistRemoteDatafnE2eeSettings(next.settings);
    await initializeNucleumDatafn({
      ...requireLastInitializeInput(),
      isOfflinabilityEnabled: true
    });
    await cloneUpAllDatafnData();
  } catch (error) {
    await persistRemoteDatafnE2eeSettings(settings).catch((restoreError) => {
      logger.error({
        at: "datafn.e2ee.password.restoreRemoteSettings",
        error: restoreError
      });
    });
    await persistDatafnE2eeSettings(runtime.namespace, settings);
    await initializeNucleumDatafn({
      ...requireLastInitializeInput(),
      isOfflinabilityEnabled: true
    }).catch((restoreError) => {
      logger.error({
        at: "datafn.e2ee.password.restoreRuntime",
        error: restoreError
      });
    });
    throw error;
  }
  return next.settings;
}

export async function disableNucleumDatafnE2ee() {
  const initInput = requireLastInitializeInput();
  const runtime = get(runtimeStore);
  if (!runtime) throw new Error("DataFn runtime is not initialized");
  const settings = await getLocalDatafnE2eeSettings(runtime.namespace);
  const restoreProvider = await getCachedDatafnE2eeProvider(settings);
  if (settings?.enabled && !restoreProvider) {
    throw new Error("Unlock E2EE before disabling it");
  }
  const disabled = createDisabledDatafnE2eeSettings();
  await datafn.switchContext({ e2ee: null });
  try {
    await persistRemoteDatafnE2eeSettings(disabled);
    await cloneUpAllDatafnData();
    await disableLocalDatafnE2ee(settings, runtime.namespace, disabled);
  } catch (error) {
    if (settings?.enabled && restoreProvider) {
      try {
        await persistRemoteDatafnE2eeSettings(settings);
      } catch (restoreError) {
        const recoverySettings: NucleumDatafnE2eeSettings = {
          ...settings,
          recoveryRequired: "restore-remote"
        };
        await datafn.switchContext({
          e2ee: { enabled: true, provider: restoreProvider },
          sync: { mode: "local-only" }
        });
        await persistDatafnE2eeSettings(runtime.namespace, recoverySettings);
        await initializeNucleumDatafn({
          ...initInput,
          isOffline: true,
          isOfflinabilityEnabled: true
        }).catch((recoveryError) => {
          logger.error({
            at: "datafn.e2ee.disable.enterRecoveryMode",
            error: recoveryError
          });
        });
        logger.error({
          at: "datafn.e2ee.disable.restoreSettings",
          error,
          restoreError
        });
        throw restoreError;
      }
      await datafn.switchContext({
        e2ee: { enabled: true, provider: restoreProvider }
      });
      await persistDatafnE2eeSettings(runtime.namespace, settings);
    }
    throw error;
  }
  await initializeNucleumDatafn(initInput);
  return disabled;
}

export async function refreshNucleumDatafnStatus() {
  const runtime = get(runtimeStore);
  if (!runtime) {
    nucleumDatafnStatus.set(initialStatus);
    return initialStatus;
  }
  const status = await datafn.sync.refreshStatus();
  const next = resolveNucleumDatafnStatus(status, runtime);
  nucleumDatafnStatus.set(next);
  return next;
}

export async function pullDatafnNow() {
  const runtime = get(runtimeStore);
  if (!runtime || runtime.mode !== "sync") return;
  await datafn.sync.pullNow();
  await refreshNucleumDatafnStatus();
}

export async function reconcileDatafnNow() {
  const runtime = get(runtimeStore);
  if (!runtime || runtime.mode !== "sync") return;
  await datafn.sync.reconcileNow();
  await refreshNucleumDatafnStatus();
}

async function applyNucleumDatafnConnectivity(isOffline: boolean) {
  const runtime = get(runtimeStore);
  const input = lastInitializeInput;
  if (!runtime || !input) return runtime;
  const nextInput = { ...input, isOffline };
  const isE2eeEnabled = get(datafnE2eeState).enabled;
  const nextMode = resolveDatafnMode({
    ...nextInput,
    isOfflinabilityEnabled: isE2eeEnabled
      ? true
      : nextInput.isOfflinabilityEnabled
  });
  if (nextMode === runtime.mode) {
    lastInitializeInput = nextInput;
    return runtime;
  }
  return initializeNucleumDatafn(nextInput);
}

export function updateNucleumDatafnConnectivity(isOffline: boolean) {
  const generation = ++connectivityGeneration;
  const transition = connectivityTransition.then(() => {
    if (generation !== connectivityGeneration) return get(runtimeStore);
    return applyNucleumDatafnConnectivity(isOffline);
  });
  connectivityTransition = transition.catch(() => get(runtimeStore));
  return transition;
}

export async function clearDatafnLocalData() {
  const runtime = get(runtimeStore);
  if (!runtime?.storage) return;
  await datafn.clear();
  await refreshNucleumDatafnStatus();
}

async function flushNucleumDatafnMutations() {
  try {
    await datafn.flushAll();
  } catch (error) {
    logger.error({ at: "datafn.runtime.flushAll", error });
  }
}

async function assertDatafnLocalCloneCanBeRetired(
  runtime: NucleumDatafnRuntime
) {
  if (runtime.mode !== "sync") {
    throw new Error(
      "Local DataFn data cannot be retired before synchronization"
    );
  }
  await datafn.flushAll();
  const attempts = 40;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const status = await datafn.sync.refreshStatus();
    if (status.pendingChanges === 0) return;
    if (!status.online || status.status === "error") {
      throw new Error(
        status.lastError ?? "Local DataFn changes are not synchronized"
      );
    }
    await datafn.sync.schedulePush();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out while synchronizing local DataFn changes");
}

function stopNucleumDatafnSync() {
  try {
    datafn.sync.stop();
  } catch (error) {
    logger.error({ at: "datafn.runtime.stopSync", error });
  }
}

async function resolveDatafnRemoteUrl(account: Pick<UserAccount, "userInfo">) {
  const region =
    account.userInfo?.region ??
    (await clientStorage.get(ClientStorageKey.REGION)) ??
    "insouth";
  return `${resolveAccountBaseUrl(region).replace(/\/$/, "")}/datafn`;
}

/**
 * Configures the shared DataFn client for a read-only public-link session.
 */
export async function initializeNucleumPublicLinkDatafn(input: {
  token: string;
  region: string;
}) {
  await destroyNucleumDatafn();
  const remoteUrl = `${resolveAccountBaseUrl(input.region).replace(/\/$/, "")}/datafn`;
  await datafn.switchContext({
    clientId: `public-link-${crypto.randomUUID()}`,
    namespace: "public-link",
    storage: null,
    searchProvider: null,
    e2ee: null,
    sync: {
      mode: "sync",
      remote: remoteUrl,
      http: await createNucleumDatafnHttpOptions({
        publicLinkToken: input.token
      }),
      offlinability: false,
      crossTab: false,
      ws: false
    }
  });
}
