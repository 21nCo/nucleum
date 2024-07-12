<script lang="ts">
  import { renderPopover } from "$lib/client/utils/browser.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import Tooltip from "./Tooltip.svelte";
  import HoverableElement from "../HoverableElement.svelte";
  export let text: string = "";
  export let tooltip: string | undefined = undefined;
  export let delay: number = 1500;
  export let id: string = "";
  export let truncateLength: number | undefined = undefined;
  let textRef: any;
  let toolTipRef: any;
  let timer: any;
  let classList: string = "";
  /**
   * @readonly
   */
  export let isHovering: boolean = false;
  export { classList as class };
  const onHover = (event: any) => {
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
    renderPopover({
      triggerRef: textRef,
      popRef: toolTipRef
    });
  }
</script>

<HoverableElement
  {id}
  bind:this={textRef}
  class={cn(classList, "relative")}
  bind:isHovering
  on:hover={onHover}
>
  {truncateLength != undefined
    ? text.slice(0, truncateLength) +
      (text.length > truncateLength ? "..." : "")
    : text}
  <span bind:this={toolTipRef} class="tooltip">
    <Tooltip tooltip={tooltip ?? text} />
  </span>
</HoverableElement>
