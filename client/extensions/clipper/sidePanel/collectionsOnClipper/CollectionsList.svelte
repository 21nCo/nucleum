<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import CollectionItem from "./CollectionItem.svelte";
  import type { CollectionData } from "./types";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";

  export let collections: CollectionData[];

  const dispatch = createEventDispatcher<{
    collectionClick: CollectionData;
  }>();

  function handleCollectionClick(event: CustomEvent<CollectionData>) {
    dispatch("collectionClick", event.detail);
  }
</script>

<div class="flex-1 overflow-y-auto">
  {#if collections.length === 0}
    <EmptyStatusView
      mainText="No collections found"
      subText="Only collections that has web page nodes will be shown here."
      isSearchContext={true}
    />
  {:else}
    <div class="p-3 space-y-1">
      {#each collections as collection (collection.id)}
        <CollectionItem {collection} on:click={handleCollectionClick} />
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
