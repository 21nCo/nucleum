<svelte:options runes={true} />

<script lang="ts">
  import { appStore } from "@21n/stores/app.store";
  import { onMount } from "svelte";
  import { CacheKey } from "@21n/layout/layers/cache/cache.type";
  import { cache } from "@21n/layout/layers/cache/cache.store";
  import { resourceCacheKey } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import {
    datafn,
    resolveDatafnProductResources
  } from "@21n/stores/datafn.store";
  let components = $state<any[]>([]);
  const globalCacheKeys: string[] = [CacheKey.CALENDAR_CACHE];

  onMount(() => {
    globalCacheKeys.forEach((key) => {
      const action = appStore.resolveAction(key);
      if (action) components = [...components, action];
    });
    let disposeSignals = () => {};
    const unsubscribeClient = datafn.subscribeClient(() => {
      disposeSignals();
      const signals: Array<{ dispose(): void }> = [];
      const unsubscribes: Array<() => void> = [];
      const resources = resolveDatafnProductResources($appStore.product);
      const countsSignal = datafn.resourceCountsSignal({ resources });
      signals.push(countsSignal);
      unsubscribes.push(
        countsSignal.subscribe((counts) => {
          for (const [resource, count] of Object.entries(counts)) {
            replaceResourceCount(resource, count);
          }
        })
      );
      if (resources.includes("node")) {
        const nodeSignal = datafn.node.signal({
          select: ["contentType"],
          filters: { metaType: false }
        });
        signals.push(nodeSignal);
        unsubscribes.push(
          nodeSignal.subscribe((nodes) => {
            const counts = new Map<string, number>();
            for (const node of nodes) {
              if (!node.contentType) continue;
              const contentType = node.contentType.toUpperCase();
              counts.set(contentType, (counts.get(contentType) ?? 0) + 1);
            }
            cache.replace(
              resourceCacheKey(Resource.node, CacheKey.SUB_TYPE_COUNTS),
              counts
            );
          })
        );
      }
      disposeSignals = () => {
        unsubscribes.forEach((unsubscribe) => unsubscribe());
        signals.forEach((signal) => signal.dispose());
      };
    });
    return () => {
      unsubscribeClient();
      disposeSignals();
    };
  });

  function replaceResourceCount(resource: string, count: number) {
    cache.replace(`${resource}-${CacheKey.COUNT}`, count);
    const legacyResource = {
      objective: Resource.goal,
      space: Resource.combination,
      linkTag: Resource.relation
    }[resource];
    if (legacyResource) {
      cache.replace(resourceCacheKey(legacyResource, CacheKey.COUNT), count);
    }
  }
</script>

<div>
  {#each components as item (item.action)}
    {@const Component = item.component}
    <Component {...item.componentParams} />
  {/each}
</div>
