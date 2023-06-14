<script lang="ts">
  import Button from "$lib/tidy/elements/Button.svelte";
  import { EventType } from "$lib/tidy/types/event.enum";
  import { Size } from "$lib/tidy/types/size.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import PopoverHeader from "./PopoverHeader.svelte";
  import { appEvents, windowObject } from "$lib/tidy/stores/app.store";
  import { fade, fly } from "svelte/transition";
  export let show = true;
  export let size: Size = Size.lg;
  export let title: string = "";
  export let isShowOverlay: boolean = true;
  export let isOnRight: boolean = false;
  export let primaryText: string | undefined = undefined;
  export let secondaryText: string | undefined = undefined;
  export let isShowClose: boolean = true;
  export let isDismissable: boolean = true;
  let useDialog: boolean = true;
  let dialog: HTMLDialogElement;
  let width: number;
  let height: number;
  let left: any;
  let top: any;
  const dispatch = createEventDispatcher();
  const overlayClicked = (event: any) => {
    if (
      (event.target.classList.contains("pop-overlay") ||
        event.target.classList.contains("popover")) &&
      isDismissable
    ) {
      close();
    }
  };
  $: if (show) dialog?.showModal();
  $: {
    if (size == Size.xs) {
      width = 400;
    } else if ($windowObject.documentWidth >= 650) {
      width = 600;
    } else {
      width = $windowObject.documentWidth - 50;
    }
    left = $windowObject.documentWidth / 2 - width / 2;
    // top = $windowObject.documentHeight / 2 - height / 2;
  }
  //$: show = $popover.visible;
  // $: {
  //   if (size == Size.xs) {
  //     height = 150;
  //   } else if (size == Size.sm) {
  //     height = 300;
  //   } else if (size == Size.md) {
  //     height = 400;
  //   } else if (size == Size.lg) {
  //     height = 800;
  //   }
  // }
  function onPrimaryActionClicked() {
    dispatch("primary");
  }
  function onSecondaryActionClicked() {
    dispatch("secondary");
  }
  function close() {
    show = false;
    appEvents.publish(EventType.POP_DISMISSED);
  }
</script>

{#if show}
  <div
    class="pop-overlay fixed top-0 left-0 w-screen h-screen bg-black {isShowOverlay
      ? 'bg-opacity-50'
      : 'bg-opacity-0'} z-50"
    on:click={overlayClicked}
    on:keydown={overlayClicked}
    transition:fade={{ duration: 200 }}
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
    {:else if useDialog}
      <dialog
        bind:this={dialog}
        class="popover rounded-md flex flex-col p-0 bg-bgs1 text-fgs1"
      >
        <div class="popover-header px-4 py-2">
          <h2>{title}</h2>
          {#if secondaryText && isShowClose}
            <div class="w-full flex justify-end text-b2">
              <button on:click={close}>Close</button>
            </div>
          {/if}
        </div>
        <div
          class="popover-content overflow-y-auto px-2"
          style="max-height: 80vh;"
        >
          <slot />
        </div>
        <div class="popover-footer flex gap-2 justify-center p-4 pt-6">
          {#if primaryText}
            <Button
              label={primaryText}
              on:click={onPrimaryActionClicked}
              type="primary"
            />
          {/if}
          {#if secondaryText}
            <Button label={secondaryText} on:click={onSecondaryActionClicked} />
          {:else if isShowClose}
            <Button label="close" on:click={close} />
          {/if}
        </div>
      </dialog>
    {:else}
      <div
        class="popover-container max-h-max flex flex-col p-4 fixed rounded-md shadow-lg bg-bgs1 z-50 overflow-y-auto"
        style="width: {width}px;  top: 5%; left: {left}px; max-height: 80vh;"
        transition:fade={{ duration: 200 }}
      >
        {#if title}
          <PopoverHeader
            {title}
            on:click={() => {
              show = false;
            }}
          />
        {/if}
        <div class="popover-body h-full w-full mb-10">
          <slot />
        </div>
        <div class="flex gap-2 justify-center">
          {#if primaryText}
            <Button
              label={primaryText}
              on:click={onPrimaryActionClicked}
              type="primary"
            />
          {/if}
          {#if secondaryText}
            <Button label={secondaryText} on:click={onSecondaryActionClicked} />
          {:else if isShowClose}
            <Button label="close" on:click={close} />
          {/if}
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
