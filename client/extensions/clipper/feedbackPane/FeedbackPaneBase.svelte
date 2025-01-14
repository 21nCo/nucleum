<script lang="ts">
  import { toolbarState } from "../contentScripts/store";
  import { Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { createEventDispatcher } from "svelte";
  import { fly, scale } from "svelte/transition";
  const dispatch = createEventDispatcher();
  export let isHovering = false;
  export let isWithoutToolbarContext: boolean = false;

  /**
   * To prevent default shortcuts interfering with the feedback pane linking or notes.
   *
   * Ex: Pressing I on Youtube minimizes the player and closes the feedback pane.
   * @param e
   */
  function onKey(e: KeyboardEvent) {
    e.stopPropagation();
  }

  function resolveFlyParams(position: Placement) {
    if (position === Placement.Right) {
      return {
        x: 10,
        duration: 300
      };
    } else if (position === Placement.Left) {
      return {
        x: -10,
        duration: 300
      };
    } else if (position === Placement.Bottom) {
      return {
        y: 10,
        duration: 300
      };
    }
  }
</script>

<button
  use:hoverable={{
    onHover: (e) => {
      isHovering = e;
      dispatch("hover", e);
    }
  }}
  on:keydown={onKey}
  on:keyup={onKey}
  class={cn(
    "fixed w-96 h-fit max-h-[40rem] mo:max-h-full flex flex-col items-center justify-center gap-4 p-4 bg-bgs1 shadow-md rounded-md border border-brs2",
    {
      "inset-y-0 my-auto":
        $toolbarState.position === Placement.Right ||
        $toolbarState.position === Placement.Left,
      "inset-x-0 mx-auto": $toolbarState.position === Placement.Bottom,
      "bottom-4":
        $toolbarState.position === Placement.Bottom && isWithoutToolbarContext,
      "bottom-20 2k:bottom-24":
        $toolbarState.position === Placement.Bottom && !isWithoutToolbarContext,
      "right-4":
        $toolbarState.position === Placement.Right && isWithoutToolbarContext,
      "right-16 2k:right-20":
        $toolbarState.position === Placement.Right && !isWithoutToolbarContext,
      "left-4":
        $toolbarState.position === Placement.Left && isWithoutToolbarContext,
      "left-16 2k:left-20":
        $toolbarState.position === Placement.Left && !isWithoutToolbarContext
    }
  )}
  in:fly={resolveFlyParams($toolbarState.position)}
  out:scale
>
  <slot />
</button>
