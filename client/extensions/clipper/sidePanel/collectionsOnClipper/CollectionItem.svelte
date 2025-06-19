<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import AvatarRenderer from "$lib/client/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import type { CollectionData } from "./types";

  export let collection: CollectionData;

  const dispatch = createEventDispatcher<{
    click: CollectionData;
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

  function handleClick() {
    dispatch("click", collection);
  }
</script>

<div
  class="flex items-center gap-3 p-3 rounded-lg hover:bg-bgs2 cursor-pointer group transition-colors"
  on:click={handleClick}
  role="button"
  tabindex="0"
  on:keydown={(e) => e.key === "Enter" && handleClick()}
>
  <div class="flex-shrink-0">
    {#if collection.type === CollectionType.TYPED && collection.avatar}
      <AvatarRenderer avatar={collection.avatar} size={Size.md} />
    {:else}
      <Icon icon={getCollectionIcon(collection) ?? "ph:brackets-round-light"} />
    {/if}
  </div>

  <div class="flex-1 min-w-0">
    <div
      class="font-medium text-fgs2 text-b2 group-hover:text-fgs1 transition-colors"
    >
      {collection.label}
    </div>
    <div class="text-fgs3 text-b3 mt-1">
      {collection.itemCount} web page{collection.itemCount !== 1 ? "s" : ""}
    </div>
  </div>

  <div
    class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
  >
    <Icon icon="ph:caret-right" size={Size.sm} />
  </div>
</div>
