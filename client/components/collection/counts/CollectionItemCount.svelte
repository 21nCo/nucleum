<script lang="ts">
  import type { ICollectionThumb } from "@21n/components/collection/collection.type";
  import { onMount } from "svelte";
  import CountBadge from "@21n/components/collection/counts/CountBadge.svelte";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { resourceCacheKey } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";

  let {
    item,
    isShowLabel = false
  }: {
    item: ICollectionThumb;
    isShowLabel?: boolean;
  } = $props();
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
  onChange={refreshNodeCount}
/>
