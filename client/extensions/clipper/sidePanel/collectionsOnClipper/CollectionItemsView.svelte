<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import WebpageItem from "./WebpageItem.svelte";
  import type { CollectionData, CollectionItem } from "./types";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { openAppPath } from "$lib/client/utils/extension.utils";

  export let selectedCollection: CollectionData;
  export let collectionItems: CollectionItem[];
  export let isLoadingItems: boolean;
  export let currentUrl: string;

  const dispatch = createEventDispatcher<{
    back: void;
  }>();

  function getCollectionIcon(collection: CollectionData): string | null {
    if (collection.type === CollectionType.TYPED && collection.avatar) {
      return null;
    } else if (collection.type === CollectionType.QUERY) {
      return "ph:at";
    } else {
      return "ph:circles-four";
    }
  }

  function handleBackClick() {
    dispatch("back");
  }

  function handleOpenInAppClick() {
    openAppPath(`library?pop=${selectedCollection.id}`);
  }
</script>

<div
  class="flex items-center gap-2 min-h-16 h-16 px-3 border-b border-bgs3 bg-bgs2"
>
  <Button
    icon="chevron-left"
    tooltip="Back"
    parentBgIndex={2}
    on:click={handleBackClick}
  />
  <div class="flex items-center gap-2 flex-1">
    {#if selectedCollection.type === CollectionType.TYPED && selectedCollection.avatar}
      <AvatarRenderer avatar={selectedCollection.avatar} size={Size.sm} />
    {:else}
      <Icon
        icon={getCollectionIcon(selectedCollection) ?? "ph:circles-four"}
        size={Size.sm}
      />
    {/if}
    <div>
      <div class="font-medium text-fgs1 text-b2">
        {selectedCollection.label}
      </div>
      <div class="text-fgs3 text-b3">
        {collectionItems.length} web page{collectionItems.length !== 1
          ? "s"
          : ""}
      </div>
    </div>
  </div>
  <Button
    icon="weblink-two"
    tooltip="Open in app"
    parentBgIndex={2}
    on:click={handleOpenInAppClick}
  />
</div>

<div class="flex-1 overflow-y-auto">
  {#if isLoadingItems}
    <div class="flex items-center justify-center py-8">
      <div
        class="animate-spin rounded-full h-5 w-5 border-b-2 border-aps1"
      ></div>
      <span class="ml-2 text-b2 text-fgs2">Loading items...</span>
    </div>
  {:else if collectionItems.length === 0}
    <EmptyStatusView
      mainText="No webpage nodes found"
      subText="Link a webpage to this collection from toolbar to view it here"
    />
  {:else}
    <div class="space-y-2 p-3">
      {#each collectionItems as item (item.id)}
        <WebpageItem {item} {currentUrl} />
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {/if}
</div>
