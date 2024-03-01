<script lang="ts">
  import { windowObject } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import type { InfoTextParams } from "$lib/tidy/types/text.type";
  import { renderPopover } from "$lib/tidy/utils/browser.utils";
  import { onMount } from "svelte";
  import Icon from "../Icon.svelte";
  export let info: InfoTextParams;
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
    renderPopover(buttonRef, toolTipRef);
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
      renderPopover(buttonRef, toolTipRef);
    } else {
      hideToolTip();
    }
  }}
  bind:this={buttonRef}
>
  <Icon icon="info" size={Size.sm} />
  <div
    class="text-left flex flex-col gap-2 text-b2 text-fgs2 bg-bgs3 rounded-md p-4 z-30 min-w-[15rem] {$windowObject.isInPortraitMode
      ? 'top-full'
      : 'left-full'}"
    bind:this={toolTipRef}
  >
    {info.body}
    {#if info.link}
      <a
        class="text-b4 font-medium text-a1 hover:opacity-80"
        href={info.link}
        target="_blank"
        rel="noopener noreferrer"
      >
        {info.linkText ?? "Learn more"}
      </a>
    {/if}
  </div>
</button>
