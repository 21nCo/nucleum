<script lang="ts">
  import type { ICollectionThumb } from "../collection.type";
  import { onMount } from "svelte";
  import CountBadge from "./CountBadge.svelte";
  import { cache } from "$lib/client/layout/layers/cache/cache.store";
  import { resourceCacheKey } from "../../flux/resourceStores/resource.utils";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { CacheKey } from "$lib/client/layout/layers/cache/cache.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";

  export let item: ICollectionThumb;
  export let isShowLabel: boolean = false;
  let nodeCount: number | undefined = undefined;
  const cacheKey = resourceCacheKey(Resource.collection, CacheKey.ITEM_COUNTS);
  onMount(async () => {
    await refreshNodeCount();
  });

  async function refreshNodeCount() {
    nodeCount = cache.retrieve(cacheKey)?.[item.id.toString()] || 0;
  }

  function resolveLabel() {
    if (!isShowLabel) return undefined;
    const label = item.resource ?? "item";
    return nodeCount === 1 ? label : `${label}s`;
  }
</script>

{#if nodeCount}
  <CountBadge count={nodeCount} label={resolveLabel()} />
{/if}

<ComponentBaseLayer
  subscribeToCacheUpdate={[cacheKey]}
  on:change={refreshNodeCount}
/>
