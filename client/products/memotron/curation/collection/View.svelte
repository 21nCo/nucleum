<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import {
    CollectionLayout,
    type ICollectionView
  } from "$lib/client/types/memotron/curation.type";
  import type { INodeThumbnail } from "$lib/client/types/memotron/node.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import BoardView from "./boardView/BoardView.svelte";
  export let view: ICollectionView;
  export let data: INodeThumbnail[] = [];
  export let properties: IProperty[] | null = null;
  export let isBoardOverflow = false;
</script>

{#if isValidArrayWithData(data)}
  {#if view.layout === CollectionLayout.BOARD}
    <BoardView {view} {data} {properties} {isBoardOverflow} />
  {:else}
    <!-- TODO -->
    <ComingSoonView subText="View not built yet. Stay tuned." />
  {/if}
{:else}
  <EmptyStatusView subText="No records match the criteria." />
{/if}
