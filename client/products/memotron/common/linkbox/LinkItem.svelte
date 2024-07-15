<script lang="ts">
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { truncateString } from "$lib/client/utils/text.utils";
  const dispatch = createEventDispatcher();
  export let id: string;
  let item: any;
  let isHovering = false;
  function resolveItem() {
    const dexie = $dataManager.cacheSource.dexie;
    if (id.includes("collection")) {
      return dexie.collection.get(id);
    } else if (id.includes("node")) {
      return dexie.node.get(id);
    }
  }
  onMount(async () => {
    item = await resolveItem();
  });
</script>

<HoverableElement
  class="relative flex text-b2 whitespace-nowrap border border-brs2 rounded-full px-2 py-1"
  on:click
  bind:isHovering
>
  {item?.label ? truncateString(item?.label, 24) : ""}
  {#if isHovering}
    <button
      class="absolute top-0 right-0 rounded-full bg-gradient-to-l from-bgs2 via-bgs2 to-transparent pr-2 pl-10 flex h-full items-center"
      on:click={(e) => {
        dispatch("remove");
        e.stopPropagation();
      }}
    >
      <Icon icon="cross" />
    </button>
  {/if}
</HoverableElement>
