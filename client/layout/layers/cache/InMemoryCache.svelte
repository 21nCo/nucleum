<svelte:options runes={true} />

<script lang="ts">
  import {
    resolveProductResources,
    resourceCacheComponentKey
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { appStore } from "@21n/stores/app.store";
  import { onMount } from "svelte";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  let components = $state<any[]>([]);
  const globalCacheKeys: string[] = [CacheKey.CALENDAR_CACHE];

  onMount(() => {
    const resources = resolveProductResources($appStore.product);
    const resourceCacheKeys = resources?.map((resource) =>
      resourceCacheComponentKey(resource)
    );
    [...(resourceCacheKeys ?? []), ...globalCacheKeys].forEach((key) => {
      const action = appStore.resolveAction(key);
      if (action) components = [...components, action];
    });
  });
</script>

<div>
  {#each components as item (item.action)}
    {@const Component = item.component}
    <Component {...item.componentParams} />
  {/each}
</div>
