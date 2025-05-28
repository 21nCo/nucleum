<script lang="ts">
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import { cache } from "$lib/client/layout/layers/cache/cache.store";
  import { onMount } from "svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { resourceCacheKey } from "../flux/resourceStores/resource.utils";
  import { CacheKey } from "$lib/client/layout/layers/cache/cache.type";
  import { RemovalProperty } from "$lib/client/types/data.type";

  export let resource: Resource;
  const searchStore = new SearchStore(resource);

  onMount(async () => {
    await refresh();
  });

  async function refresh() {
    await refreshCounts();
  }

  async function refreshCounts() {
    const result = await searchStore.resolveCount();
    cache.replace(resourceCacheKey(resource, CacheKey.COUNT), result);
    if (resource === Resource.node) {
      const subTypeCounts = await searchStore.resolveSubTypeCounts(resource);
      cache.replace(
        resourceCacheKey(resource, CacheKey.SUB_TYPE_COUNTS),
        subTypeCounts
      );
    }
  }
</script>

<ComponentBaseLayer
  subscribeToResource={new Set([resource])}
  subscriptionPropsForMergeAction={Object.values(RemovalProperty)}
  on:change={refresh}
  on:syncDown={refresh}
/>
