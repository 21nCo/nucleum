<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import { resolveHoverState } from "$lib/client/utils/browser.utils";
  let isHovering = false;
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    if (resolveHoverState(event)) {
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
  class="fixed right-0 top-1/2 w-5 h-6 hover:w-20 bg-aps1 text-bgs1 dark:text-fgs1 rounded-l-full border-l border-y border-brs3 shadow-md flex px-1 items-center justify-center"
  on:click
>
  <Icon
    icon={isHovering ? "chevleft" : "chevright"}
    class="stroke-bgs1 dark:stroke-fgs1"
  />
  {isHovering ? "Clipper" : ""}
</button>
