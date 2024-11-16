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
  import { logger } from "../debug/logger.client";
  import { resolveModalOnFront } from "$lib/client/utils/browser.utils";
  import { ResourceAccessMode } from "../flux/resourceStores/resource.type";
  import view from "$lib/client/stores/view.store";
  import { userPreferences } from "../settings/userPreferences.store";
  export let index: number = 0;
  export let show = true;
  export let title: string = "";
  export let isShowOverlay: boolean = true;
  export let isOnRight: boolean = false;
  export let isDismissable: boolean = true;
  export let isUseDialog: boolean = false;
  export let size: Size = Size.md;
  export let orientation: Orientation = Orientation.Vertical;
  export let hasCantileverButtons: boolean = false;
  let dialog: HTMLDialogElement;
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

  /**
   * This is triggered when the overlay is clicked.
   *
   *
   * Note: PointerId check is added since space key input in <InlineMarkdownTextInput> is emitting a PointerEvent and closing the modal which is not intented. However, the pointerId is reliable on macOS and the modal is not getting closed when clicking from macOS app.
   *
   * TODO - test resolution for pointerId - macOS scenario
   *
   * @param event
   */
  const overlayClicked = (event: any) => {
    logger.log({
      at: "overlayClicked",
      id,
      classList: event.target?.classList,
      eventTargetId: event.target?.id,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      detail: event.detail,
      eventNodeName: event.target?.nodeName,
      event: event
    });
    if (
      (((event.target?.classList?.contains("pop-overlay") ||
        event.target?.classList?.contains("popover") ||
        event.target?.id === id) &&
        event.pointerType === "mouse") ||
        event.target.nodeName === "DIALOG") &&
      isDismissable
    ) {
      close();
    }
  };

  function close() {
    const frontModal = resolveModalOnFront();
    logger.log({ at: "Modal.svelte close", id, frontModal });
    confirmationNotification.reset();
    if (frontModal?.id?.includes("-resource")) {
      appStore.closeResource({ accessMode: ResourceAccessMode.POP });
    }
    if (!frontModal || id != frontModal?.id) return;
    show = false;
    modalEvent.hide(id, "Modal.svelte");
  }

  /**
   * This is to prevent the dialog from closing when the user presses `Escape` key from any input element inside the dialog.
   * @param e
   */
  function handleClose(e: any) {
    dialog.showModal();
  }

  function resolveSizeClasses() {
    return {
      "w-full h-full min-h-screen min-w-screen": size === Size.full,
      // "w-[20rem] tp:w-[25rem] h-[25rem] min-h-[20rem]": size === Size.sm,
      "w-[20rem] tp:w-[25rem] h-[25rem] min-h-[20rem]": size === Size.xs,
      "w-[55rem] 2k:w-[65rem] h-full dp:h-full tp:h-[60rem] vm:h-[60rem] 2k:h-full":
        orientation === Orientation.Vertical && size === Size.xxl,
      "w-[45rem] 2k:w-[55rem] h-full tp:h-[60rem] dp:h-full vm:h-[60rem]  2k:h-full":
        orientation === Orientation.Vertical && size === Size.xl,
      "w-[40rem] 2k:w-[45rem] h-9/10 vm:h-[55rem] tp:h-[55rem] 2k:h-[60rem]":
        orientation === Orientation.Vertical && size === Size.lg,
      "w-[30rem] 2k:w-[35rem] h-[40rem] 2k:h-[50rem]":
        orientation === Orientation.Vertical && size === Size.md,
      "w-[30rem] 2k:w-[35rem] h-[30rem] 2k:h-[40rem]":
        orientation === Orientation.Vertical && size === Size.sm,
      "w-[80rem] 2k:w-[110rem] h-[56rem] 2k:h-full vm:h-[80rem]":
        orientation === Orientation.Horizontal && size === Size.xxl,
      "w-[70rem] 2k:w-[100rem] h-[56rem] 2k:h-[70rem] vm:h-[70rem]":
        orientation === Orientation.Horizontal && size === Size.xl,
      "w-[60rem] 2k:w-[80rem] h-[50rem] 2k:h-[60rem]":
        orientation === Orientation.Horizontal && size === Size.lg,
      "w-[50rem] 2k:w-[60rem] h-[40rem] 2k:h-[50rem]":
        orientation === Orientation.Horizontal && size === Size.md,
      "max-w-9/10": hasCantileverButtons && !$view.isConstrainedWidth
    };
  }
</script>

{#if show}
  {#if isOnRight}
    <div
      class="popover-container fixed right-8 bg-bgs2 z-50 rounded-md overflow-y-auto"
      style="height:min-content;bottom: 5%;"
    >
      {#if title}
        <ModalHeader
          {title}
          on:click={() => {
            show = false;
          }}
        />
      {/if}
      <div class="popover-body w-full overflow-y-auto">
        <ColorLayer>
          <slot />
        </ColorLayer>
      </div>
    </div>
  {:else}
    <button
      class={cn(
        "pop-overlay fixed w-screen h-screen inset-0 z-50",
        {
          "bg-opacity-0": !isShowOverlay,
          "flex justify-center items-center mo:p-0 p-3":
            !isUseDialog && size !== Size.full
        },
        isShowOverlay &&
          !isUseDialog && {
            "bg-black bg-opacity-60":
              !$userPreferences.appearance.isBlurredBgForPopups,
            "backdrop-blur-2xl backdrop-opacity--80 backdrop-brightness--50 backdrop-grayscale bg-fgs4 bg-opacity-50 backdrop-saturate--50":
              $userPreferences.appearance.isBlurredBgForPopups
          }
      )}
      {id}
      data-blank-modal={index}
      transition:fade={{ duration: 100 }}
      on:click={overlayClicked}
    >
      <!-- {#if isOnRight}
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
        </div> -->
      {#if isUseDialog}
        <dialog
          bind:this={dialog}
          id={id + "-modal"}
          on:close|preventDefault={handleClose}
          class={cn(
            "rounded-md flex flex-col p-0 text-fgs1 shadow--bgs4 shadow-xl cw:w-full ch:h-full max-h-full",
            {
              "bg-bgs1 overlay": isShowOverlay,
              "overlay-light": isShowOverlay && !$appearance.colorScheme.isDark,
              "overlay-dark": isShowOverlay && $appearance.colorScheme.isDark,
              "bg-none": !isShowOverlay,
              ...resolveSizeClasses()
            }
          )}
        >
          <div bind:this={focusTrap} tabindex="-1" style="outline: none;"></div>
          <ColorLayer>
            <slot />
          </ColorLayer>
        </dialog>
      {:else}
        <div
          id={id + "-modal"}
          class={cn("bg-bgs1 mo:w-full mo:h-full max-h-full", {
            ...resolveSizeClasses(),
            "mo:rounded-none rounded-md": size !== Size.full
          })}
        >
          <ColorLayer>
            <slot />
          </ColorLayer>
        </div>
      {/if}
    </button>
  {/if}
{/if}

<style>
  .popover-container {
    transform: translate3d(0, 0, 0);
  }

  dialog.overlay::backdrop {
    backdrop-filter: blur(10px) grayscale(100%);
  }

  dialog.overlay-light::backdrop {
    background-color: rgba(0, 0, 0, 0.2);
  }
  dialog.overlay-dark::backdrop {
    background-color: rgba(251, 251, 251, 0.4);
  }
  dialog.bg-none::backdrop {
    background-color: transparent;
  }
</style>
