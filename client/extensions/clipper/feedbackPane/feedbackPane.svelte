<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import Linkbox from "$lib/client/products/memotron/common/linkbox/Linkbox.svelte";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  export let isShown: boolean = false;
  export let toolbarPosition: Position.Right | Position.Left | Position.Bottom =
    Position.Right;
  export let feedback: string = "";
  let closeTimer: any;
  let closeActionTimestamp: number;
  let isHovering = false;
  let now = Date.now();
  function onHover() {
    restartCloseTimer();
  }
  onMount(() => {
    restartCloseTimer();
  });
  function restartCloseTimer() {
    clearTimeout(closeTimer);
    if (isHovering) {
      return;
    }
    closeActionTimestamp = Date.now();
    closeTimer = setTimeout(() => {
      // isShown = false;
    }, 5000);
  }
  setInterval(() => {
    now = Date.now();
  }, 1000);
  $: countdown = 4 - Math.floor((now - closeActionTimestamp) / 1000);
</script>

<HoverableElement
  bind:isHovering
  on:hover={onHover}
  class={cn(
    "fixed w-80 flex flex-col p-4 bg-bgs1 shadow-md rounded-md border border-brs2",
    {
      "right-16 top-1/2 transform -translate-y-1/2 space-y-1.5":
        toolbarPosition === Position.Right,
      "bottom-0 right-0 m-6": toolbarPosition === Position.Bottom
    }
  )}
>
  <div class="flex flex-col gap-2">
    <div class="flex w-full justify-between">
      <span class="text-fgs2"> Link this page </span>
      <span>
        {#if isHovering}
          <Button
            icon="cross-circled"
            on:click={() => {
              isShown = false;
            }}
          />
        {:else}
          <!-- TODO closing animation circle -->
          <span class="border border-fgs2 rounded-full text-b4 text-fgs2 px-1">
            {countdown}
          </span>
        {/if}
      </span>
    </div>
    <!-- <Linkbox /> -->
    <LinkBoxOnClipper />
  </div>
  <!-- <div>
    isHovering: {isHovering}
  </div> -->
  <div class="flex w-full justify-center text-fgs2 text-b2 h-4">{feedback}</div>
</HoverableElement>
