<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import {
    renderPopover,
    trackPosition
  } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import Icon from "../../Icon.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import Tooltip from "../Tooltip.svelte";
  import type { InputLabelInfoToolTip } from "$lib/client/types/input.type";
  export let info: InputLabelInfoToolTip;
  let isHovered: boolean = false;
  let isClicked: boolean = false;
  let toolTipRef: any;
  let buttonRef: any;

  onMount(() => {
    hideToolTip();
  });

  function hideToolTip() {
    if (toolTipRef && toolTipRef?.style?.display != "none")
      toolTipRef.style.display = "none";
  }
  function showToolTip() {
    renderPopover({
      triggerRef: buttonRef,
      popRef: toolTipRef,
      placement: info?.placement ?? Placement.Right,
      isUseAbsolutePositioning: info?.isUseAbsolutePositioning
    });
  }
  function handlePositionChange(event: CustomEvent) {
    hideToolTip();
  }
</script>

<button
  class="relative rounded-full w-4 h-4 flex justify-center items-center text-b3 text-fgs3 cursor-pointer"
  use:trackPosition
  on:positionchange={handlePositionChange}
  on:mouseenter={() => {
    if (isClicked) return;
    isHovered = true;
    showToolTip();
  }}
  on:mouseleave={() => {
    if (isClicked) return;
    isHovered = false;
    hideToolTip();
  }}
  on:click={() => {
    isClicked = !isClicked;
    if (isClicked) {
      hideToolTip();
      showToolTip();
    } else {
      hideToolTip();
    }
  }}
  bind:this={buttonRef}
>
  <Icon icon="info" size={info.size ?? Size.sm} />
  <div bind:this={toolTipRef}>
    <Tooltip {info} />
  </div>
</button>
