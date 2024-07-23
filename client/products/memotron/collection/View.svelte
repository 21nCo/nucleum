<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import {
    CollectionLayout,
    type ICollectionView
  } from "$lib/client/products/memotron/collection/collection.type";
  import type { INodeThumbnail } from "$lib/client/products/memotron/node/node.type";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import BoardView from "./boardView/BoardView.svelte";
  export let view: ICollectionView;
  export let data: INodeThumbnail[] = [];
  export let properties: string[] = [];
  export let isBoardOverflow = false;
</script>

{#if isValidArrayWithData(data)}
  {#if view.layout === CollectionLayout.BOARD}
    <BoardView {view} {data} propertyIds={properties} {isBoardOverflow} />
  {:else}
    <!-- TODO -->
    <ComingSoonView subText="View not built yet. Stay tuned." />
  {/if}
{:else}
  <EmptyStatusView subText="No records match the criteria." />
{/if}
