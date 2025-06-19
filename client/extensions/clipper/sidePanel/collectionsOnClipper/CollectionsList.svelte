<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import CollectionItem from "./CollectionItem.svelte";
  import type { CollectionData } from "./types";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";

  export let collections: CollectionData[];
  export let isLoading: boolean;
  export let error: string | undefined;

  const dispatch = createEventDispatcher<{
    collectionClick: CollectionData;
  }>();

  function handleCollectionClick(event: CustomEvent<CollectionData>) {
    dispatch("collectionClick", event.detail);
  }
</script>

<div class="flex-1 overflow-y-auto">
  {#if isLoading}
    <div class="flex items-center justify-center py-8">
      <div
        class="animate-spin rounded-full h-5 w-5 border-b-2 border-aps1"
      ></div>
      <span class="ml-2 text-b2 text-fgs2">Loading collections...</span>
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center py-8 text-red-600">
      <Icon icon="ph:warning-circle" size={Size.lg} />
      <p class="mt-2 text-b2">{error}</p>
    </div>
  {:else if collections.length === 0}
    <EmptyStatusView
      mainText="No collections found"
      subText="Only collections that has web page nodes will be shown here."
    />
    <!-- <div class="flex flex-col items-center justify-center py-8 text-fgs2">
      <Icon icon="ph:brackets-round-light" size={Size.lg} />
      <p class="mt-2 text-b2">No collections found</p>
      <p class="text-b3 text-fgs3 mt-1">
        Only collections that has web page nodes will be shown here.
      </p>
    </div> -->
  {:else}
    <div class="p-3 space-y-1">
      {#each collections as collection (collection.id)}
        <CollectionItem {collection} on:click={handleCollectionClick} />
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
