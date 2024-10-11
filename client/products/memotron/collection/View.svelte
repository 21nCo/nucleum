<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import {
    CollectionLayout,
    type ICollectionView
  } from "$lib/client/products/memotron/collection/collection.type";
  import type { INodeThumb } from "$lib/client/products/memotron/node/node.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import BoardView from "./boardView/BoardView.svelte";
  import type { IProperty } from "./properties/property.type";
  export let view: ICollectionView;
  export let data: INodeThumb[] = [];
  export let properties: IProperty[] = [];
  export let isBoardOverflow = false;
  export let isInEditMode = false;

  $: if (!view.arrangement) {
    view.arrangement = Arrangement.LIST;
  }
</script>

{#if isValidArrayWithData(data)}
  {#if view.layout === CollectionLayout.BOARD}
    <BoardView {view} {data} {isInEditMode} {properties} {isBoardOverflow} />
  {:else}
    <!-- TODO -->
    <ComingSoonView subText="View not built yet. Stay tuned." />
  {/if}
{:else}
  <EmptyStatusView subText="No records match the criteria." />
{/if}
