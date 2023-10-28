<script lang="ts">
  import { Size } from "$lib/tidy/types/size.enum";
  import { modalEvent, windowObject } from "$lib/tidy/stores/app.store";
  import { fade } from "svelte/transition";
  import ModalHeader from "./ModalHeader.svelte";
  import { generateUID } from "$lib/tidy/utils/utils";
  export let show = true;
  export let size: Size = Size.lg;
  export let title: string = "";
  export let isShowOverlay: boolean = true;
  export let isOnRight: boolean = false;
  export let isDismissable: boolean = true;
  export let isUseDialog: boolean = true;
  let dialog: HTMLDialogElement;
  let width: number;
  let left: any;
  export let id = generateUID();
  $: if (show) dialog?.showModal();
  const overlayClicked = (event: any) => {
    if (
      (event.target?.classList?.contains("pop-overlay") ||
        event.target?.classList?.contains("popover") ||
        event.target?.id === id) &&
      event.pointerId != -1 &&
      isDismissable
    ) {
      close();
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
    // top = $windowObject.documentHeight / 2 - height / 2;
  }
  function close() {
    show = false;
    modalEvent.notify({
      path: id,
      isShow: false,
    });
  }
</script>

{#if show}
  <button
    class="pop-overlay fixed top-0 left-0 w-screen h-screen bg-black {isShowOverlay
      ? 'bg-opacity-50'
      : 'bg-opacity-0'} z-50"
    on:click={overlayClicked}
    transition:fade={{ duration: 200 }}
  >
    {#if isOnRight}
      <div
        class="popover-container fixed right-8 w-72 bg-bgs2 z-50 rounded-md overflow-y-auto"
        style="height: 90%; top: 5%;"
      >
        {#if title}
          <ModalHeader path={title} />
          on:click={() => {
            show = false;
          }}
          />
        {/if}
        <div class="popover-body h-full w-full p-4 overflow-y-auto pb-40">
          <slot />
        </div>
      </div>
    {:else if isUseDialog}
      <dialog
        bind:this={dialog}
        {id}
        class="rounded-md flex flex-col p-0 bg-bgs1 text-fgs1"
      >
        <slot />
        <!-- <div class="popover-content" style="max-height: 80vh;" /> -->
      </dialog>
    {:else}
      <div
        class="popover-container max-h-max flex flex-col p-4 fixed rounded-md shadow-lg bg-bgs1 z-50 overflow-y-auto"
        style="width: {width}px;  top: 5%; left: {left}px; max-height: 80vh;"
        transition:fade={{ duration: 200 }}
      >
        <div class="popover-body h-full w-full mb-10">
          <slot />
        </div>
      </div>
    {/if}
  </button>
{/if}

<style>
  .popover-container {
    transform: translate3d(0, 0, 0);
  }
</style>
