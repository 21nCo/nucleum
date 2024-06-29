<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import type { FormLabelInfoTooltip } from "$lib/client/types/text.type";
  import { renderPopoverv2 } from "$lib/client/utils/browser.utils";
  import { onMount } from "svelte";
  import Icon from "../../Icon.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import Tooltip from "../Tooltip.svelte";
  export let info: FormLabelInfoTooltip;
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
</script>

<button
  class="relative rounded-full w-4 h-4 flex justify-center items-center text-b3 text-fgs3 cursor-pointer"
  on:mouseenter={() => {
    if (isClicked) return;
    isHovered = true;
    renderPopoverv2(buttonRef, toolTipRef, Position.Right);
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
      renderPopoverv2(buttonRef, toolTipRef, Position.Right);
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
