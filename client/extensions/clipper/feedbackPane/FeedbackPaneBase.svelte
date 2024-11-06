<script lang="ts">
  import { toolbarState } from "../contentScripts/store";
  import { Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { hoverable } from "$lib/client/actions/hover.action";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();
  export let isHovering = false;

  /**
   * To prevent default shortcuts interfering with the feedback pane linking or notes.
   *
   * Ex: Pressing I on Youtube minimizes the player and closes the feedback pane.
   * @param e
   */
  function onKey(e: KeyboardEvent) {
    e.stopPropagation();
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
    "fixed w-96 flex flex-col items-center gap-4 p-4 bg-bgs1 shadow-md rounded-md border border-brs2",
    {
      "right-16 2k:right-20 top-1/2 transform -translate-y-1/2 space-y-1.5":
        $toolbarState.position === Placement.Right,
      "bottom-0 right-0 m-6": $toolbarState.position === Placement.Bottom
    }
  )}
>
  <slot />
</button>
