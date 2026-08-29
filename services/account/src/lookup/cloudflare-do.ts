import {
  createCloudflareDurableObjectAtomicKVStore,
  SuperfunctionsStoresDurableObject,
  type CloudflareDurableObjectNamespace,
} from '@superfunctions/db/adapters/cloudflare-do';

export { SuperfunctionsStoresDurableObject as AuthFnRegionLookupDurableObject };

export function createAccountCloudflareLookupStore(
  namespace: CloudflareDurableObjectNamespace,
) {
  return createCloudflareDurableObjectAtomicKVStore(namespace, {
    objectNamePrefix: `${process.env.AUTHFN_NAMESPACE ?? 'nucleus_account'}:`,
  });
}
