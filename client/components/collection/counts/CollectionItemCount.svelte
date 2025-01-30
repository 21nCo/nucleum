<script lang="ts">
  import type { ICollectionThumb } from "../collection.type";
  import { onMount } from "svelte";
  import CountBadge from "./CountBadge.svelte";
  import { collectionCountStore } from "../collectionCount.store";

  export let item: ICollectionThumb;
  export let isShowLabel: boolean = false;
  let nodeCount: number | undefined = undefined;
  onMount(async () => {
    await refreshNodeCount();
  });

  async function refreshNodeCount() {
    nodeCount = await collectionCountStore.resolveCount(item.id);
  }

  function resolveLabel() {
    if (!isShowLabel) return undefined;
    return nodeCount === 1 ? "item" : "items";
  }
</script>

{#if nodeCount}
  <CountBadge count={nodeCount} label={resolveLabel()} />
{/if}
