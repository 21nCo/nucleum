<script lang="ts">
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import { flux } from "$lib/client/components/flux/flux";
  const dispatch = createEventDispatcher();
  export let id: string;
  let item: any;
  let isHovering = false;
  function resolveItem() {
    return flux.select(id);
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
