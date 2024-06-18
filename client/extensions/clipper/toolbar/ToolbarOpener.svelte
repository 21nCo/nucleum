<script lang="ts">
  //   import { resolveHoverState } from "$lib/client/utils/browser.utils";
  let isHovering = false;
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    //TODO - use resolveHoverState
    if (event.type === "mouseover" || event.type === "focus") {
      isHovering = true;
    } else {
      isHovering = false;
    }
  };
</script>

<button
  on:mouseover={toggleHoveringState}
  on:mouseleave={toggleHoveringState}
  on:focus={toggleHoveringState}
  on:blur={toggleHoveringState}
  class="fixed right-0 top-1/2 w-5 h-6 hover:w-20 bg-aps1 rounded-l-full border-l border-y border-brs3 shadow-md flex px-1"
  on:click
>
  {isHovering ? "clipper" : "c"}
</button>
