<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { resolveHoverState } from "../utils/browser.utils";
  export let type: string = "div";
  export let id: string = "";
  let classList: string = "";
  let styles: string = "";
  /**
   * @readonly
   */
  export let isHovering: boolean = false;
  export { classList as class };
  export { styles as style };
  const dispatch = createEventDispatcher();
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    isHovering = resolveHoverState(event);
    dispatch("hover", isHovering);
  };
</script>

<svelte:element
  this={type}
  {id}
  class={classList}
  style={styles}
  on:mouseover={toggleHoveringState}
  on:mouseleave={toggleHoveringState}
  on:focus={toggleHoveringState}
  on:blur={toggleHoveringState}
  on:click
  on:touchcancel
  on:touchend
  on:touchmove
  on:touchstart
>
  <slot />
</svelte:element>
