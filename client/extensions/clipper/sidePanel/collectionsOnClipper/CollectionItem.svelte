<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import AvatarRenderer from "@21n/elements/avatarPicker/AvatarRenderer.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import { Size } from "@21n/types/size.enum";
  import { CollectionType } from "@21n/components/collection/collection.type";
  import type { CollectionData } from "@21n/extensions/clipper/sidePanel/collectionsOnClipper/types";

  export let collection: CollectionData;

  const dispatch = createEventDispatcher<{
    click: CollectionData;
  }>();

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
      <Icon icon="collection" />
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
