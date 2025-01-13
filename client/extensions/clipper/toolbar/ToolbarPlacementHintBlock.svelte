<script lang="ts">
  import { Placement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { toolbarState } from "../contentScripts/store";
  export let position: Placement.Bottom | Placement.Left | Placement.Right =
    Placement.Bottom;
  let isDraggedOver: boolean = false;
</script>

<div
  class={cn("fixed flex justify-center items-center", {
    "bottom-0 inset-x-0 w-full": position === Placement.Bottom,
    "left-0 inset-y-0 h-full": position === Placement.Left,
    "right-0 inset-y-0 h-full": position === Placement.Right
  })}
>
  <button
    class={cn(
      "flex items-center justify-center p-2 text-center m-4 border-2 rounded-md text-fgs3",
      {
        "w-3/5 min-h-72": position === Placement.Bottom,
        "h-3/5 min-w-72":
          position === Placement.Left || position === Placement.Right,
        "border-solid border-brs3 bg-bgs3": isDraggedOver,
        "border-dashed border-brs2 bg-bgs2": !isDraggedOver
      }
    )}
    on:dragover={(event) => {
      event.preventDefault();
      isDraggedOver = true;
    }}
    on:dragleave={() => {
      isDraggedOver = false;
    }}
    on:drop={() => {
      isDraggedOver = false;
      console.log({ at: "on:drop", position });
      if (position) {
        toolbarState.changePosition(position);
      }
    }}
  >
    Move here to stick toolbar to the {position.toLowerCase()}
  </button>
</div>
