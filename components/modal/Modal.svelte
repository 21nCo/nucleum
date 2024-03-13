<script lang="ts">
  import {
    appStore,
    confirmationNotification,
    modalEvent
  } from "$lib/tidy/stores/app.store";
  import { fade } from "svelte/transition";
  import ModalHeader from "./ModalHeader.svelte";
  import { generateUID } from "$lib/tidy/utils/utils";
  import { Size } from "$lib/tidy/types/size.enum";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { EmbedContext, LaunchContext } from "$lib/tidy/types/appStore.type";
  export let show = true;
  export let title: string = "";
  export let isShowOverlay: boolean = true;
  export let isOnRight: boolean = false;
  export let isDismissable: boolean = true;
  export let isUseDialog: boolean = true;
  export let size: Size = Size.md;
  export let orientation: Orientation = Orientation.Vertical;
  let dialog: HTMLDialogElement;
  let sizingClass = "";
  resolveSize();
  let width: number;
  let left: any;
  export let id = generateUID();
  $: if (show) dialog?.showModal();
  const overlayClicked = (event: any) => {
    if (
      (event.target?.classList?.contains("pop-overlay") ||
        event.target?.classList?.contains("popover") ||
        event.target?.id === id) &&
      event.pointerId &&
      event.pointerId != -1 &&
      isDismissable
    ) {
      close();
    }
  };
  // $: {
  //   if (size == Size.xs) {
  //     width = 400;
  //   } else if ($windowObject.documentWidth >= 650) {
  //     width = 600;
  //   } else {
  //     width = $windowObject.documentWidth - 50;
  //   }
  //   left = $windowObject.documentWidth / 2 - width / 2;
  //   // top = $windowObject.documentHeight / 2 - height / 2;
  // }
  function close() {
    show = false;
    modalEvent.hideSpecific(id, "Modal.svelte");
    confirmationNotification.reset();
  }
  function resolveSize() {
    if (orientation === Orientation.Vertical) {
      switch (size) {
        case Size.xs:
          sizingClass = "w-[18rem] md:w-[20rem] h-[20rem] min-h-[15rem]";
          break;
        case Size.sm:
          sizingClass = "w-[20rem] md:w-[25rem] h-[25rem] min-h-[20rem]";
          break;
        case Size.md:
          sizingClass = "w-[20rem] md:w-[30rem] h-[35rem] min-h-[30rem]";
          break;
        case Size.lg:
          sizingClass =
            "w-[21rem] sm:w-[28rem] md:w-[35rem] h-[45rem] min-h-[40rem]";
          break;
        case Size.xl:
          sizingClass =
            "w-[21rem] sm:w-[30rem] md:w-[40rem] h-[50rem] min-h-[45rem]";
          break;
        case Size.full:
          sizingClass = "w-full h-full min-h-screen min-w-screen";
          break;
        default:
          sizingClass = "w-[20rem] md:w-[30rem] h-[35rem] min-h-[30rem]";
          break;
      }
      return;
    } else if (orientation === Orientation.Horizontal) {
      switch (size) {
        case Size.xs:
          sizingClass = "w-[18rem] md:w-[20rem] h-[20rem] min-h-[15rem]";
          break;
        case Size.sm:
          sizingClass = "w-[20rem] md:w-[25rem] h-[25rem] min-h-[20rem]";
          break;
        case Size.md:
          sizingClass =
            "w-[21rem] sm:w-[30rem] md:w-[45rem] h-[30rem] min-h-[30rem]";
          break;
        case Size.lg:
          sizingClass =
            "w-[21rem] sm:w-[35rem] md:w-[50rem] h-[45rem] min-h-[45rem]";
          break;
        case Size.xl:
          sizingClass = "w-[21rem] sm:w-[80%] 2xl:w-[100rem] h-[90%]";
          break;
        case Size.full:
          sizingClass = "w-full h-full min-h-screen min-w-screen";
          break;
        default:
          sizingClass =
            "w-[21rem] sm:w-[30rem] md:w-[40rem] h-[25rem] min-h-[25rem]";
          break;
      }
      return;
    }
  }
</script>

{#if show}
  <button
    class="pop-overlay fixed w-screen h-screen inset-0 {isShowOverlay
      ? 'bg-bgs1 bg-opacity-80'
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
          <ModalHeader {title} />
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
        class="rounded-md flex flex-col p-0 bg-bgs1 text-fgs1 {!isShowOverlay &&
          'bg-none'} {$appStore.launchContext === LaunchContext.EMBED &&
        $appStore.embedContext === EmbedContext.SHEET
          ? 'w-full h-full'
          : sizingClass}"
      >
        <slot />
        <!-- <div class="popover-content" style="max-height: 80vh;" /> -->
      </dialog>
    {:else}
      <!-- <div
        class="popover-container max-h-max flex flex-col p-4 fixed rounded-md shadow-lg bg-bgs1 z-50 overflow-y-auto"
        style="width: {width}px;  top: 5%; left: {left}px; max-height: 80vh;"
        transition:fade={{ duration: 200 }}
      >
        <div class="popover-body h-full w-full mb-10">
          <slot />
        </div>
      </div> -->
      <slot />
    {/if}
  </button>
{/if}

<style>
  .popover-container {
    transform: translate3d(0, 0, 0);
  }

  dialog.bg-none::backdrop {
    background-color: transparent;
  }
</style>
