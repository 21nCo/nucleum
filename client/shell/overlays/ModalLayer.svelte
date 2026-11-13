<svelte:options runes={true} />

<script lang="ts">
  import Modal from "@nucleum/shell/modal/Modal.svelte";
  import { requireActionRenderer } from "@nucleum/shared-state/resources/action-renderer";
  import view from "@21n/ui/environment/view.store";
  import modalEvent, {
    fullScreen,
    player
  } from "@nucleum/shell/overlays/modal.store";
  import {
    toasts,
    confirmationNotification,
    fullPageLoadingScreen
  } from "@nucleum/shared-state/notifications/notification.store";
  import { appEvents } from "@nucleum/shared-state/events/app-events.store";
  import { Size } from "@21n/ui/elements/size.enum";
  import { fly, slide } from "svelte/transition";
  import { onMount } from "svelte";
  import type { ModalEvent } from "@21n/ui/elements/modal/popup.type";
  import { GlobalEvent } from "@nucleum/shared-state/events/event.enum";
  import type { IEvent } from "@21n/ui/elements/input/event.type";
  import { postDataToParent } from "@nucleum/client/runtime/embed/embed.utils";
  import ToastNotification from "@nucleum/shell/notifications/ToastNotification.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import ModalLayout from "@nucleum/shell/modal/ModalLayout.svelte";
  import PageLoadingAnimation from "@21n/ui/elements/feedback/animations/PageLoadingAnimation.svelte";
  import context from "@nucleum/client/runtime/context.store";
  import { Embed } from "@nucleum/client/runtime/context.type";
  import { Orientation, Placement } from "@21n/ui/elements/direction.enum";
  import ColorLayer from "@nucleum/shell/layers/themeLayer/ColorLayer.svelte";
  import { Action } from "@nucleum/client/config/action.enum";
  import { logger } from "@nucleum/client/runtime/logging/logger";
  import { cn } from "@21n/ui/environment/presentation";
  import ConfirmationNotification from "@nucleum/shell/notifications/ConfirmationNotification.svelte";
  import { EmbedDataMessage } from "@nucleum/client/runtime/embed/embedMessage.enum";
  import {
    isPlayerShownInPage,
    isPortraitMiniPlayerDocked
  } from "@nucleum/shell/overlays/portrait-dock";
  import {
    isToastRaisedAboveModal,
    shouldRaiseToasts
  } from "@nucleum/shell/overlays/raised-toasts";
  import TopNavToasts from "@nucleum/shell/topNav/TopNavToasts.svelte";
  const ComponentResolver = requireActionRenderer();
  let modals = $state<ModalEvent[]>([]);
  let isShowAppearancePreview = $state(false);
  let isWindowVisible = $state(true);
  let isDialogEnabled = $state(false);
  const isRightDrawerOpen = $derived(
    !$view.isConstrainedWidth &&
      modals.some(
        (modal) =>
          modal?.isShow !== false &&
          modal?.layout?.alignment === Placement.Right
      )
  );
  const isToastRaised = $derived(
    shouldRaiseToasts({
      toastCount: $toasts.length,
      openModalCount: modals.filter((modal) => modal?.path).length,
      hasConfirmation: Boolean($confirmationNotification),
      isPortrait: $view.isPortrait
    })
  );
  $effect(() => {
    isToastRaisedAboveModal.set(isToastRaised);
  });
  $effect(() => () => isToastRaisedAboveModal.set(false));
  onMount(() => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      if (x.event == GlobalEvent.SHOW_APPEARANCE_PREVIEW) {
        isShowAppearancePreview = x.value ?? false;
      } else if (x.event === GlobalEvent.USER_LOGIN) {
        modals = [];
      }
    });
    const modalEventSub = modalEvent.subscribe(modalEventSubscriber);

    return () => {
      appEventSub();
      modalEventSub();
    };

    /**
     *
     *
     * Modal events are ignored if the window is not visible. This is to avoid app crash when the app is running as an embed on macOS app and is in background.
     *
     */
    function modalEventSubscriber(x: ModalEvent) {
      if (!isWindowVisible) {
        logger.log({
          context: "ModalLayer",
          message: "modal event ignored - window is not visible"
        });
        return;
      }
      logger.log({ context: "modal event - ModalLayer", event: x });
      if (!x.isShow) {
        modals = modals.filter((y) => y.path != x.path);
        postDataToParent(EmbedDataMessage.MODAL, x);
      } else if (
        $context.isEmbed &&
        $context.embed === Embed.HANDSET &&
        x.isShowAsSheet
      ) {
        postDataToParent(EmbedDataMessage.MODAL, {
          isShow: x.isShow,
          path: x.path,
          title: x.title,
          params: x.componentParams
        });
      } else if (x.path && x.isShow) {
        const existingIndex = modals.findIndex((y) => y.path == x.path);
        if (existingIndex > -1) {
          const nextModals = [...modals];
          nextModals.splice(existingIndex, 1);
          modals = [...nextModals, x];
        } else {
          modals = [...modals, x];
        }
        if ($view.isPortrait) toasts.reset();
        postDataToParent(EmbedDataMessage.ENABLE_GESTURE_NAVIGATION, false);
      }
      logger.log({ modals });
    }
  });
  const visibilityChangeListener = () => {
    isWindowVisible = !document.hidden;
  };
</script>

{#if $fullPageLoadingScreen.isShow}
  <div class="fixed left-0 top-0 w-full h-full flex flex-col z-[100]">
    <div
      class="h-full w-full flex flex-col gap-4 justify-center items-center bg-bgs1"
      transition:fly={{ y: 200, duration: 100 }}
    >
      <PageLoadingAnimation variant="page" />
      <div class="text-b2">
        {$fullPageLoadingScreen.text}
      </div>
    </div>
  </div>
{/if}

{#if !$view.isPortrait && $player.isMiniOn}
  <div
    class={cn(
      "fixed bottom-0 right-0 mb-6 mr-6 flex flex-col items-end gap-4",
      {
        "z-[100]": !$fullScreen.path && !isRightDrawerOpen,
        "z-40": $fullScreen.path || isRightDrawerOpen
      }
    )}
    inert={isRightDrawerOpen}
  >
    {#if $player.isMiniOn}
      <div class={cn("player", { "opacity-0": $fullScreen.path })}>
        <ColorLayer>
          <ComponentResolver
            path={$player.action}
            isPreventErrorFeedback={true}
          />
        </ColorLayer>
      </div>
    {/if}
  </div>
{/if}

{#if $view.isPortrait && $isPortraitMiniPlayerDocked}
  <div
    class="fixed bottom-0 inset-x-0 z-30 pb-6 bg-bgs1 border-t border-brs2"
    data-testid="portrait-mini-player"
  >
    <ComponentResolver path={$player.action} isPreventErrorFeedback={true} />
  </div>
{/if}

{#if isValidArrayWithData($toasts) && $view.isPortrait}
  <div
    class={cn(
      "fixed bottom-0 left-0 mx-6 flex flex-col justify-center w-full gap-4 z-[100]",
      {
        "mb-24": !$isPortraitMiniPlayerDocked && !$isPlayerShownInPage,
        "mb-[6.5rem]": $isPlayerShownInPage,
        "mb-[10.5rem]": $isPortraitMiniPlayerDocked
      }
    )}
    transition:slide={{ duration: 200, axis: "x" }}
  >
    {#each $toasts as toast}
      <ToastNotification notification={toast} />
    {/each}
  </div>
{/if}
{#each modals.filter((modal) => modal?.path) as modal, index (modal.path === Action.CMD ? `${modal.path}-${modal.componentParams?.command ?? "default"}-${modal.componentParams?.commandType ?? "default"}` : modal.path)}
  <Modal
    show={modal.isShow}
    id={modal.path}
    {index}
    isDismissable={modal.isDismissable ?? true}
    isShowOverlay={modal.isShowOverlay ?? true}
    isUseDialog={modal.layout?.size != Size.full &&
      $context.embed != Embed.HANDSET &&
      isDialogEnabled}
    size={modal.layout?.size ?? Size.md}
    isDynamicSize={modal.layout?.isDynamicSize}
    orientation={modal.layout?.orientation ?? Orientation.Vertical}
    title={modal.title}
    alignment={modal.layout?.alignment}
    hasCantileverButtons={modal.layout?.isShowCantileverClose ||
      modal.layout?.isShowBackButton}
  >
    <ModalLayout path={modal.path} params={modal}>
      <ComponentResolver
        path={modal.path}
        params={{ ...modal.componentParams, isModal: true }}
      />
    </ModalLayout>
  </Modal>
{/each}

{#if $confirmationNotification}
  <Modal
    show={true}
    id={Action.CONFIRMATION}
    isDismissable={true}
    size={$confirmationNotification.size ?? Size.xs}
    orientation={Orientation.Horizontal}
  >
    <ModalLayout
      path={Action.CONFIRMATION}
      params={{
        title: $confirmationNotification.title,
        layout: {
          size: $confirmationNotification.size ?? Size.xs,
          orientation: Orientation.Horizontal,
          isOveriddenFooter: true
        }
      }}
    >
      <ConfirmationNotification />
    </ModalLayout>
  </Modal>
{/if}

{#if isToastRaised}
  <div
    class="fixed top-0 inset-x-0 z-[55] flex justify-center mt-1 pointer-events-none"
    data-testid="modal-raised-toasts"
  >
    <div
      class="flex items-center h-12 max-w-[32rem] rounded-md bg-bgs2 border border-brs3 shadow-lg pointer-events-auto"
    >
      <TopNavToasts />
    </div>
  </div>
{/if}

<svelte:document onvisibilitychange={visibilityChangeListener} />
