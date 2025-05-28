<script lang="ts">
  import {
    resolveProductResources,
    resourceCacheComponentKey
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { appStore } from "$lib/client/stores/app.store";
  import { onMount } from "svelte";
  import { CacheKey } from "./cache.type";
  let components: any[] = [];
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
    <svelte:component this={item.component} {...item.componentParams} />
  {/each}
</div>
