<script lang="ts">
  import {
    renderPopoverv2,
    resolveHoverState
  } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import Tooltip from "./Tooltip.svelte";
  import { Direction } from "$lib/client/types/direction.enum";
  export let text: string = "";
  export let tooltip: string | undefined = undefined;
  export let delay: number = 1500;
  export let id: string = "";
  export let truncateLength: number | undefined = undefined;
  let textRef: HTMLSpanElement;
  let toolTipRef: any;
  let timer: any;
  let classList: string = "";
  /**
   * @readonly
   */
  export let isHovering: boolean = false;
  export { classList as class };
  const toggleHoveringState = (event: MouseEvent | FocusEvent) => {
    isHovering = resolveHoverState(event);
    clearTimeout(timer);
    if (!isHovering) {
      hideToolTip();
      return;
    }
    timer = setTimeout(() => {
      showToolTip();
    }, delay);
  };
  onMount(() => {
    hideToolTip();
  });
  function hideToolTip() {
    if (toolTipRef && toolTipRef?.style?.display != "none")
      toolTipRef.style.display = "none";
  }
  function showToolTip() {
    renderPopoverv2(textRef, toolTipRef, Direction.Down);
  }
</script>

<span
  {id}
  bind:this={textRef}
  class={cn(classList, "relative")}
  on:mouseover={toggleHoveringState}
  on:mouseleave={toggleHoveringState}
  on:focus={toggleHoveringState}
  on:blur={toggleHoveringState}
>
  {truncateLength != undefined
    ? text.slice(0, truncateLength) +
      (text.length > truncateLength ? "..." : "")
    : text}
  <span bind:this={toolTipRef} class="tooltip">
    <Tooltip tooltip={tooltip ?? text} />
  </span>
</span>
