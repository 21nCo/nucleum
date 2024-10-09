<script lang="ts">
  import { toolbarState } from "../contentScripts/store";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";

  export let isHovering = false;
</script>

<HoverableElement
  bind:isHovering
  on:hover
  class={cn(
    "fixed w-96 flex flex-col gap-4 p-4 bg-bgs1 shadow-md rounded-md border border-brs2",
    {
      "right-16 2k:right-20 top-1/2 transform -translate-y-1/2 space-y-1.5":
        $toolbarState.position === Placement.Right,
      "bottom-0 right-0 m-6": $toolbarState.position === Placement.Bottom
    }
  )}
>
  <slot />
</HoverableElement>
