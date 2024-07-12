<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import HoverableElement from "$lib/client/elements/HoverableElement.svelte";
  import FormControlLabel from "$lib/client/elements/text/formLabel/FormControlLabel.svelte";
  import LinkBoxOnClipper from "$lib/client/products/memotron/common/linkbox/LinkBoxOnClipper.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { onMount } from "svelte";
  import { toolbarState, webpage } from "../contentScripts/store";
  import LinkItems from "$lib/client/products/memotron/common/linkbox/LinkItems.svelte";
  export let isShown: boolean = false;
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
      isShown = false;
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
    "fixed w-80 flex flex-col gap-3 p-4 bg-bgs1 shadow-md rounded-md border border-brs2",
    {
      "right-16 top-1/2 transform -translate-y-1/2 space-y-1.5":
        $toolbarState.position === Position.Right,
      "bottom-0 right-0 m-6": $toolbarState.position === Position.Bottom
    }
  )}
>
  <div class="flex flex-col gap-1">
    <div class="flex w-full justify-between items-center">
      <!-- <span class="text-fgs3 text-b2"> Link this page </span> -->
      <FormControlLabel
        props={{
          label: "Link this page",
          tooltip: {
            body: "Link this web page to a node or add it to a collection by searching and clicking"
          }
        }}
      />
      <span class="h-6 w-6 flex justify-center items-center">
        {#if isHovering}
          <Button
            icon="cross-circled"
            on:click={() => {
              isShown = false;
            }}
          />
        {:else}
          <!-- TODO closing animation circle -->
          <span
            class="border border-fgs2 rounded-full text-b4 text-fgs2 px-1 h-4 flex justify-center items-center"
          >
            {countdown}
          </span>
        {/if}
      </span>
    </div>
    <LinkBoxOnClipper
      on:link={(e) => {
        console.log("link", e.detail.item);
        if (e.detail.item.id) webpage.linkPage(e.detail.item.id);
      }}
    />
  </div>
  <LinkItems links={$webpage.links} />
  <!-- <div>
    isHovering: {isHovering}
  </div> -->
  <div class="flex w-full justify-center text-fgs2 text-b2 h-4">{feedback}</div>
</HoverableElement>
