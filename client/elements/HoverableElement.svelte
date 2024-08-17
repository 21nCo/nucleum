<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { renderPopover, resolveHoverState } from "../utils/browser.utils";
  import { Position } from "../types/direction.enum";
  import Tooltip from "./text/Tooltip.svelte";
  import type { IToolTipOptions } from "./text/text.type";
  export let type: string = "div";
  export let id: string = "";
  export let isDisabled: boolean = false;
  export let tooltip: string | undefined = undefined;
  export let tooltipOptions: IToolTipOptions = {
    placement: Position.BottomCenter,
    offsetInPx: 4,
    isSpanToTriggerWidth: false,
    isUseAbsolutePositioning: false,
    delay: 800
  };
  let classList: string = "";
  let styles: string = "";
  let toolTipRef: HTMLDivElement;
  /**
   * @readonly
   */
  export let isHovering: boolean = false;
  export { classList as class };
  export { styles as style };
  const dispatch = createEventDispatcher();
  let toolTipTimeout: any;
  let triggerRef: HTMLElement;

  onMount(() => {
    if (toolTipRef) hideToolTip();
  });

  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    isHovering = resolveHoverState(event);
    dispatch("hover", isHovering);
    if (isHovering && tooltip) {
      isHovering = true;
      if (toolTipTimeout) clearTimeout(toolTipTimeout);
      if (toolTipRef)
        toolTipTimeout = setTimeout(() => {
          renderPopover({
            triggerRef,
            popRef: toolTipRef,
            placement: tooltipOptions.placement ?? Position.BottomCenter,
            offsetInPx: tooltipOptions.offsetInPx ?? 4,
            isUseAbsolutePositioning:
              tooltipOptions.isUseAbsolutePositioning ?? false
          });
        }, tooltipOptions.delay ?? 800);
    } else {
      if (toolTipTimeout) clearTimeout(toolTipTimeout);
      hideToolTip();
    }
  };
  function hideToolTip() {
    if (toolTipRef) toolTipRef.style.display = "none";
  }
  function onClick(event: MouseEvent | FocusEvent) {
    if (toolTipTimeout) clearTimeout(toolTipTimeout);
    if (tooltip) hideToolTip();
    if (isDisabled) return;
    dispatch("click", event);
  }
</script>

<svelte:element
  this={type}
  {id}
  bind:this={triggerRef}
  class={classList}
  style={styles}
  on:mouseover={toggleHoveringState}
  on:mouseleave={toggleHoveringState}
  on:focus={toggleHoveringState}
  on:blur={toggleHoveringState}
  on:click={onClick}
  on:touchcancel
  on:touchend
  on:touchmove
  on:touchstart
  on:contextmenu
>
  <slot />
  {#if tooltip}
    <div bind:this={toolTipRef}>
      <Tooltip {tooltip} />
    </div>
  {/if}
</svelte:element>
