<script lang="ts">
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { confirmationNotification } from "$lib/client/stores/notification.store";
  import { fade } from "svelte/transition";
  import ModalHeader from "./ModalHeader.svelte";
  import { generateUID } from "$lib/client/utils/utils";
  import { Size } from "$lib/client/types/size.enum";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import appearance from "$lib/client/stores/appearance.store";
  import ColorLayer from "$lib/client/layout/layers/themeLayer/ColorLayer.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  export let show = true;
  export let title: string = "";
  export let isShowOverlay: boolean = true;
  export let isOnRight: boolean = false;
  export let isDismissable: boolean = true;
  export let isUseDialog: boolean = true;
  export let size: Size = Size.md;
  export let orientation: Orientation = Orientation.Vertical;
  let dialog: HTMLDialogElement;
  let width: number;
  let left: any;
  /**
   * Safari focuses the dialog element or a button present on the dialog when the dilaog is shown. This focusTrap is used to remove the focus from the dialog element or the button.
   *
   * TODO: This is a hack to remove focus from dialog element which is happening in safari - disabled for now as it is interfering with textbox focus - workaround - check if the document.activeElement is input and then proceed to remove focus
   *
   */
  let focusTrap: HTMLDivElement;
  export let id = generateUID();
  $: if (show && dialog && !dialog.open) {
    dialog.showModal();
    // setTimeout(() => focusTrap?.focus(), 0);
  }
  const overlayClicked = (event: any) => {
    // console.log("overlayClicked", event, id);
    if (
      (((event.target?.classList?.contains("pop-overlay") ||
        event.target?.classList?.contains("popover") ||
        event.target?.id === id) &&
        event.pointerId &&
        event.pointerId != -1) ||
        event.target.nodeName === "DIALOG") &&
      isDismissable
    ) {
      close();
    }
  };
  // onMount(() => {
  //   setTimeout(() => document.body.focus(), 10);
  // });
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
    appStore.closeResource({ isRestrictToModals: true });
  }

  /**
   * This is to prevent the dialog from closing when the user presses `Escape` key from any input element inside the dialog.
   * @param e
   */
  function handleClose(e: any) {
    dialog.showModal();
  }
</script>

{#if show}
  <button
    class="pop-overlay fixed w-screen h-screen inset-0 {isShowOverlay
      ? 'bg-bgs1 bg-opacity-80'
      : 'bg-opacity-0'} z-50"
    id="{id}-overlay"
    transition:fade={{ duration: 100 }}
    on:click={overlayClicked}
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
          <ColorLayer>
            <slot />
          </ColorLayer>
        </div>
      </div>
    {:else if isUseDialog}
      <dialog
        bind:this={dialog}
        {id}
        on:close|preventDefault={handleClose}
        class={cn(
          "rounded-md flex flex-col p-0 text-fgs1 shadow--bgs4 shadow-xl cw:w-full ch:h-full",
          {
            "bg-bgs1 overlay": isShowOverlay,
            "overlay-light": isShowOverlay && !$appearance.colorScheme.isDark,
            "overlay-dark": isShowOverlay && $appearance.colorScheme.isDark,
            "bg-none": !isShowOverlay,
            "w-full h-full min-h-screen min-w-screen": size === Size.full,
            // "w-[20rem] tp:w-[25rem] h-[25rem] min-h-[20rem]": size === Size.sm,
            "w-[20rem] tp:w-[25rem] h-[25rem] min-h-[20rem]": size === Size.xs,
            "w-[55rem] 2k:w-[65rem] h-full vm:h-[60rem] tp:h-[60rem] 2k:h-full":
              orientation === Orientation.Vertical && size === Size.xxl,
            "w-[45rem] 2k:w-[55rem] h-full vm:h-[60rem] tp:h-[60rem] 2k:h-full":
              orientation === Orientation.Vertical && size === Size.xl,
            "w-[40rem] 2k:w-[45rem] h-9/10 vm:h-[55rem] tp:h-[55rem] 2k:h-[60rem]":
              orientation === Orientation.Vertical && size === Size.lg,
            "w-[30rem] 2k:w-[35rem] h-[40rem] 2k:h-[50rem]":
              orientation === Orientation.Vertical && size === Size.md,
            "w-[30rem] 2k:w-[35rem] h-[30rem] 2k:h-[40rem]":
              orientation === Orientation.Vertical && size === Size.sm,
            "w-[80rem] 2k:w-[110rem] h-[56rem] 2k:h-[80rem] vm:h-[90rem]":
              orientation === Orientation.Horizontal && size === Size.xxl,
            "w-[70rem] 2k:w-[100rem] h-[56rem] 2k:h-[68rem] vm:h-[80rem]":
              orientation === Orientation.Horizontal && size === Size.xl,
            "w-[60rem] 2k:w-[80rem] h-[50rem] 2k:h-[60rem]":
              orientation === Orientation.Horizontal && size === Size.lg,
            "w-[50rem] 2k:w-[60rem] h-[40rem] 2k:h-[50rem]":
              orientation === Orientation.Horizontal && size === Size.md
          }
        )}
      >
        <div bind:this={focusTrap} tabindex="-1" style="outline: none;"></div>
        <ColorLayer>
          <slot />
        </ColorLayer>
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
      <div class="bg-bgs1 w-full h-full">
        <ColorLayer>
          <slot />
        </ColorLayer>
      </div>
    {/if}
  </button>
{/if}

<style>
  .popover-container {
    transform: translate3d(0, 0, 0);
  }

  dialog.overlay::backdrop {
    backdrop-filter: blur(5px);
  }

  /* Backdrop similar shade as bg */
  /* dialog.overlay-light::backdrop {
    background-color: rgba(0, 0, 0, 0.05);
  }
  dialog.overlay-dark::backdrop {
    background-color: rgba(251, 251, 251, 0.05);
  } */

  /* Backdrop - opposite shade of bg */
  dialog.overlay-light::backdrop {
    background-color: rgba(0, 0, 0, 0.2);
  }
  dialog.overlay-dark::backdrop {
    background-color: rgba(251, 251, 251, 0.3);
  }
  dialog.bg-none::backdrop {
    background-color: transparent;
  }
</style>
