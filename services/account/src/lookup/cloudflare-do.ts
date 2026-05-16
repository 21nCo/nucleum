import {
  createCloudflareRegionLookupStore,
  type CloudflareDurableObjectNamespace,
} from '@authfn/lookup-cloudflare-do';

export { AuthFnRegionLookupDurableObject } from '@authfn/lookup-cloudflare-do';

export function createAccountCloudflareLookupStore(
  namespace: CloudflareDurableObjectNamespace,
) {
  return createCloudflareRegionLookupStore(namespace, {
    objectNamePrefix: `${process.env.AUTHFN_NAMESPACE ?? 'nucleus_account'}:`,
  });
}
