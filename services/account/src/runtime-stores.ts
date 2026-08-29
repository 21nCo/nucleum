import type { RuntimeStores } from "@superfunctions/db";
import {
  createCloudflareDurableObjectAtomicKVStore,
  createCloudflareDurableObjectIndexedDirectoryStore,
  SuperfunctionsStoresDurableObject
} from "@superfunctions/db/adapters/cloudflare-do";
import { createMemoryRuntimeStores } from "@superfunctions/db/adapters/memory";
import { getAccountCacheStore } from "./cache.js";
import type { AccountWorkerEnv } from "./db/cloudflare.js";

export { SuperfunctionsStoresDurableObject as AccountRuntimeStoresDurableObject };

export function createAccountCloudflareRuntimeStores(
  env: Pick<AccountWorkerEnv, "ACCOUNT_CACHE" | "ACCOUNT_RUNTIME_STORES">
): RuntimeStores {
  const kv = getAccountCacheStore(env.ACCOUNT_CACHE ?? null);
  if (!env.ACCOUNT_RUNTIME_STORES) return { kv };
  const options = {
    bindingName: "ACCOUNT_RUNTIME_STORES",
    objectNamePrefix: `${process.env.AUTHFN_NAMESPACE ?? "nucleus_account"}:runtime:`
  };
  return {
    kv,
    atomicKv: createCloudflareDurableObjectAtomicKVStore(
      env.ACCOUNT_RUNTIME_STORES,
      options
    ),
    directory: createCloudflareDurableObjectIndexedDirectoryStore(
      env.ACCOUNT_RUNTIME_STORES,
      options
    )
  };
}

export function createAccountNodeRuntimeStores(): RuntimeStores {
  return createMemoryRuntimeStores();
}
