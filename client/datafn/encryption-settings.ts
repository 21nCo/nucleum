import {
  createDatafnClient,
  type DatafnE2eeConfig,
  type DatafnHttpTransportOptions
} from "@datafn/client";
import { nucleumDatafnSchema } from "@nucleum/schema";
import type { NucleumDatafnE2eeSettings } from "@nucleum/datafn/e2ee.type";
import {
  DATAFN_E2EE_KV_KEY,
  datafnE2eeState,
  getCachedDatafnE2eeProvider,
  getLocalDatafnE2eeSettings,
  persistDatafnE2eeSettings,
  unlockDatafnE2eeSettings
} from "@nucleum/datafn/datafnE2ee.store";

import { generateDatafnId } from "./record-id";
import { compareObjects } from "@21n/shared-utils/obj.utils";

type RemoteE2eeMetadataContext = {
  clientId: string;
  namespace: string;
  remoteUrl: string;
  http: DatafnHttpTransportOptions;
};

function createRemoteE2eeMetadataClient(input: RemoteE2eeMetadataContext) {
  return createDatafnClient({
    schema: nucleumDatafnSchema,
    clientId: input.clientId,
    namespace: input.namespace,
    sync: {
      mode: "sync",
      remote: input.remoteUrl,
      http: input.http,
      offlinability: false,
      crossTab: false,
      ws: false
    },
    temporal: { timezone: "user" },
    generateId: generateDatafnId
  });
}

function isDatafnE2eeSettings(
  value: unknown
): value is NucleumDatafnE2eeSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { version?: unknown }).version === 1 &&
    typeof (value as { enabled?: unknown }).enabled === "boolean"
  );
}

function requestDatafnE2eePassword(message: string) {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    throw new Error("E2EE password is required");
  }
  const password = window.prompt(message);
  if (!password) throw new Error("E2EE password is required");
  return password;
}

/** Reads encryption metadata through a temporary metadata client and always disposes it. */
export async function readRemoteDatafnE2eeSettings(input: {
  dapId: string;
  namespace: string;
  remoteUrl: string;
  http: DatafnHttpTransportOptions;
}) {
  const metadataClient = createRemoteE2eeMetadataClient({
    ...input,
    clientId: input.dapId
  });
  try {
    const settings =
      await metadataClient.kv.get<NucleumDatafnE2eeSettings>(
        DATAFN_E2EE_KV_KEY
      );
    return isDatafnE2eeSettings(settings) ? settings : null;
  } finally {
    await metadataClient.destroy();
  }
}

/** Writes encryption metadata after checking the optional recovery precondition. */
export async function writeRemoteDatafnE2eeSettings(
  input: RemoteE2eeMetadataContext & {
    settings: NucleumDatafnE2eeSettings;
    expectedSettings?: NucleumDatafnE2eeSettings | null;
  }
) {
  const metadataClient = createRemoteE2eeMetadataClient(input);
  try {
    if ("expectedSettings" in input) {
      const currentSettings =
        await metadataClient.kv.get<NucleumDatafnE2eeSettings>(
          DATAFN_E2EE_KV_KEY
        );
      if (!compareObjects(currentSettings, input.expectedSettings)) {
        throw new Error("Remote DataFn E2EE settings changed during recovery");
      }
    }
    const result = await metadataClient.kv.set(
      DATAFN_E2EE_KV_KEY,
      input.settings
    );
    if (!result.ok) throw result.error;
  } finally {
    await metadataClient.destroy();
  }
}

/** Clears the recovery marker while retaining the encryption settings. */
export function clearDatafnE2eeRecovery(
  settings: NucleumDatafnE2eeSettings
): NucleumDatafnE2eeSettings {
  const restored = { ...settings };
  delete restored.recoveryRequired;
  return restored;
}

/** Resolves and unlocks encryption settings against remote authority. */
export async function resolveDatafnE2eeConfig(input: {
  namespace: string;
  remoteSettings: NucleumDatafnE2eeSettings | null;
  hasRemoteSettingsAuthority: boolean;
}): Promise<{
  settings: NucleumDatafnE2eeSettings | null;
  config?: DatafnE2eeConfig;
}> {
  const localSettings = await getLocalDatafnE2eeSettings(input.namespace);
  if (
    input.hasRemoteSettingsAuthority &&
    input.remoteSettings?.enabled === false &&
    localSettings?.enabled
  ) {
    throw new Error("Local and remote E2EE settings are inconsistent");
  }
  const settings = input.hasRemoteSettingsAuthority
    ? (input.remoteSettings ?? (localSettings?.enabled ? localSettings : null))
    : localSettings;

  if (!settings?.enabled) {
    datafnE2eeState.set({ enabled: false, unlocked: false, keyRef: null });
    return { settings: settings ?? null };
  }

  const cachedProvider = await getCachedDatafnE2eeProvider(settings);
  if (cachedProvider) {
    await persistDatafnE2eeSettings(input.namespace, settings);
    return {
      settings,
      config: { enabled: true, provider: cachedProvider }
    };
  }

  const password = requestDatafnE2eePassword("Enter your E2EE password");
  const provider = await unlockDatafnE2eeSettings(
    settings,
    password,
    input.namespace
  );
  if (!provider) throw new Error("Unable to unlock E2EE");
  return {
    settings,
    config: { enabled: true, provider }
  };
}
