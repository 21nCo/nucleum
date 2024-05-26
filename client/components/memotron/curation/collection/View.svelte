<script lang="ts">
  import {
    CollectionLayout,
    type ICollectionView
  } from "$lib/client/types/memotron/curation.type";
  import type { IProperty } from "$lib/client/types/memotron/type.type";
  import { isValidArrayWithData } from "$lib/client/utils/obj.utils";
  import BoardView from "./boardView/BoardView.svelte";
  export let view: ICollectionView;
</script>

{#if isValidArrayWithData(view.data)}
  {#if view.layout === CollectionLayout.BOARD}
    <BoardView {view} />
  {:else}
    <!-- TODO -->
    <BoardView {view} />
  {/if}
{/if}
