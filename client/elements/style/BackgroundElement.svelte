<script lang="ts">
  import appearance from "$lib/client/stores/appearance.store";
  import { bgClass } from "$lib/client/utils/theme.utils";
  import { resolveHoverState } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  export let type: string = "div";
  export let id: string = "";
  let classList: string = "";
  /**
   * @readonly
   */
  export let isHovering: boolean = false;
  /**
   * The index of the parent's background shade. Send 0 to not have any background color.
   */
  export let parentBgIndex: number = 1;
  export { classList as class };
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    isHovering = resolveHoverState(event);
  };
</script>

<svelte:element
  this={type}
  {id}
  class={cn(classList, bgClass($appearance, parentBgIndex))}
  on:click
  on:mouseover={toggleHoveringState}
  on:mouseleave={toggleHoveringState}
  on:focus={toggleHoveringState}
  on:blur={toggleHoveringState}
>
  <slot />
</svelte:element>
