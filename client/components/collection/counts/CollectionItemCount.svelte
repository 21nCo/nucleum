<script lang="ts">
  import type { ICollectionThumb } from "../collection.type";
  import { onMount } from "svelte";
  import CountBadge from "./CountBadge.svelte";
  import { collectionStore } from "../collection.store";

  export let item: ICollectionThumb;
  export let isShowLabel: boolean = false;
  let nodeCount: number | undefined = undefined;
  onMount(async () => {
    await refreshNodeCount();
  });

  async function refreshNodeCount() {
    nodeCount = await collectionStore.resolveItemsCount(item.id);
  }

  function resolveLabel() {
    if (!isShowLabel) return undefined;
    return nodeCount === 1 ? "item" : "items";
  }
</script>

{#if nodeCount}
  <CountBadge count={nodeCount} label={resolveLabel()} />
{/if}
