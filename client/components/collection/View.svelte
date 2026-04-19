<script lang="ts">
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import {
    CollectionLayout,
    type ICollectionItem,
    type ICollectionView
  } from "@21n/components/collection/collection.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import BoardView from "@21n/components/collection/boardView/BoardView.svelte";
  import type { IActiveCollectionStore } from "@21n/components/collection/collection.store";
  let {
    collection,
    view = $bindable(),
    data = [],
    isBoardOverflow = false
  }: {
    collection: IActiveCollectionStore;
    view: ICollectionView;
    data?: ICollectionItem[];
    isBoardOverflow?: boolean;
  } = $props();

  $effect(() => {
    if (!view.arrangement) {
      view.arrangement = Arrangement.LIST;
    }
  });
</script>

{#if isValidArrayWithData(data)}
  {#if view.layout === CollectionLayout.BOARD}
    <BoardView {view} {data} {isBoardOverflow} {collection} />
  {:else}
    <ComingSoonView subText="View not built yet. Stay tuned." />
  {/if}
{:else}
  <EmptyStatusView subText="No records match the criteria." />
{/if}
