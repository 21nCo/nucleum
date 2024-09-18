<script lang="ts">
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { truncateString } from "$lib/shared/utils/text.utils";
  import { flux } from "$lib/client/components/flux/flux";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IRecordId } from "$lib/client/types/data.type";
  const dispatch = createEventDispatcher();
  export let id: IRecordId;
  export let parentBgIndex: number = 1;
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
  class="relative flex text-b2 whitespace-nowrap border border-brs3 rounded-full px-4 py-1"
  on:click
  bind:isHovering
>
  {item?.label ? truncateString(item?.label, 24) : ""}
  {#if isHovering}
    <button
      class={cn(
        "absolute top-0 right-0 rounded-full bg-gradient-to-l  to-transparent pr-2 pl-5 flex h-full items-center",
        {
          "from-bgs1 via-bgs1": parentBgIndex === 1,
          "from-bgs2 via-bgs2": parentBgIndex === 2,
          "from-bgs3 via-bgs3": parentBgIndex === 3
        }
      )}
      on:click={(e) => {
        dispatch("remove");
        e.stopPropagation();
      }}
    >
      <Icon icon="cross" />
    </button>
  {/if}
</HoverableElement>
