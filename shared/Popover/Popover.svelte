<script lang="ts">
  import { appearancePopover, windowObject } from "../../../stores/stores";
  import { Size } from "../../types/size.enum";
  import PopoverHeader from "./PopoverHeader.svelte";
  export let show = true;
  export let size: Size = Size.lg;
  export let title: string = "";
  export let isShowOverlay: boolean = true;
  export let isOnRight: boolean = false;
  let width: number;
  let height: number;
  let left: any;
  let top: any;
  const overlayClicked = (event: any) => {
    if (event.target.classList.contains("pop-overlay")) {
      show = false;
    }
  };
  $: {
    if (size == Size.xs) {
      width = 400;
    } else if ($windowObject.documentWidth >= 650) {
      width = 600;
    } else {
      width = $windowObject.documentWidth - 50;
    }
    left = $windowObject.documentWidth / 2 - width / 2;
    top = $windowObject.documentHeight / 2 - height / 2;
  }
  //$: show = $popover.visible;
  $: {
    if (size == Size.xs) {
      height = 150;
    } else if (size == Size.sm) {
      height = 300;
    } else if (size == Size.md) {
      height = 400;
    } else if (size == Size.lg) {
      height = 800;
    }
  }
</script>

{#if show}
  <div
    class="pop-overlay fixed top-0 left-0 w-screen h-screen bg-black {isShowOverlay
      ? 'bg-opacity-50'
      : 'bg-opacity-0'} z-50"
    on:click={overlayClicked}
    on:keydown={overlayClicked}
  >
    {#if isOnRight}
      <div
        class="popover-container fixed right-8 w-72 bg-bgs2 z-50 rounded-md overflow-y-auto"
        style="height: 90%; top: 5%;"
      >
        {#if title}
          <PopoverHeader
            {title}
            on:click={() => {
              show = false;
            }}
          />
        {/if}
        <div class="popover-body h-full w-full p-4 overflow-y-auto pb-40">
          <slot />
        </div>
      </div>
    {:else}
      <div
        class="popover-container absolute rounded-md shadow-lg bg-bgs1 z-100"
        style="width: {width}px; height: {height}px; top: {top}px; left: {left}px;"
      >
        {#if title}
          <PopoverHeader
            {title}
            on:click={() => {
              show = false;
            }}
          />
        {/if}
        <div class="popover-body h-full w-full">
          <slot />
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .popover-container {
    transform: translate3d(0, 0, 0);
  }
</style>
