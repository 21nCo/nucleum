import { createInMemoryKVStore } from '@superfunctions/middleware';
import { createCloudflareKVStore, type CloudflareKVNamespace } from '@superfunctions/db/adapters/cloudflare-kv';
import type { KVStoreAdapter } from '@superfunctions/db';

let memoryCacheStore: KVStoreAdapter | null = null;

export function getAccountCacheStore(namespace?: CloudflareKVNamespace | null): KVStoreAdapter {
  if (namespace) {
    return createCloudflareKVStore(namespace, {
      prefix: process.env.AUTHFN_CACHE_PREFIX ?? 'authfn:nucleus_account:',
    });
  }

  memoryCacheStore ??= createInMemoryKVStore();
  return memoryCacheStore;
}
