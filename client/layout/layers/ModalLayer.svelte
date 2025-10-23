<script lang="ts">
  import Modal from "@21n/components/modal/Modal.svelte";
  import { appStore } from "@21n/stores/app.store";
  import view from "@21n/stores/view.store";
  import modalEvent, {
    fullScreen,
    player
  } from "@21n/components/modal/modal.store";
  import {
    toasts,
    confirmationNotification,
    fullPageLoadingScreen,
    appEvents
  } from "@21n/stores/notification.store";
  import { Size } from "@21n/types/size.enum";
  import { fly, slide } from "svelte/transition";
  import ComponentResolver from "@21n/layout/paint/ComponentResolver.svelte";
  import { onMount } from "svelte";
  import type { ModalEvent, ModalParams } from "@21n/types/popup.type";
  import { GlobalEvent } from "@21n/types/event.enum";
  import type { IEvent } from "@21n/types/event.type";
  import { postDataToParent } from "@21n/utils/embed.utils";
  import ToastNotification from "@21n/elements/feedback/ToastNotification.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import ModalLayout from "@21n/components/modal/ModalLayout.svelte";
  import PageLoadingAnimation from "@21n/elements/feedback/animations/PageLoadingAnimation.svelte";
  import context from "@21n/stores/context.store";
  import { Embed } from "@21n/types/context.type";
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import SplitView from "@21n/layout/SplitView.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import ColorLayer from "@21n/layout/layers/themeLayer/ColorLayer.svelte";
  import { Action } from "@21n/types/action.enum";
  import { logger } from "@21n/components/debug/logger.client";
  import { cn } from "@21n/utils/ui.utils";
  import { renderMdAsHtml } from "@21n/components/markdown/markdown.utils";
  import { AlertType } from "@21n/types/notification.type";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import Code from "@21n/icons/Code.svelte";
  import ConfirmationNotification from "@21n/components/notifications/ConfirmationNotification.svelte";
  import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
  let modals: ModalEvent[] = [];
  let dialogRef: HTMLDialogElement;
  let isShowAppearancePreview: boolean = false;
  let fullscreen: string | undefined;
  let pop:
    | { path: string; resource: string; modalParams: ModalParams }
    | undefined;
  $: if (dialogRef) dialogRef.showModal();
  //TODO offline mode detection and showing changes pending sync
  let isShowSyncErrorMessage: boolean = false;

  let isWindowVisible: boolean = true;
  let isDialogEnabled: boolean = false;
  let isInFocusMode = false;

  onMount(() => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      if (x.event == GlobalEvent.SHOW_APPEARANCE_PREVIEW) {
        isShowAppearancePreview = x.value ?? false;
      } else if (x.event === GlobalEvent.USER_LOGIN) {
        modals = [];
      }
    });
    const pageSub = page.subscribe((value) => {
      const popParam =
        value.url.searchParams.get(ResourceAccessMode.POP) ?? undefined;
      if (popParam) {
        resolvePop(popParam);
      } else {
        pop = undefined;
      }
      fullscreen =
        value.url.searchParams.get(ResourceAccessMode.FULL) ?? undefined;
      // console.log({ pop, fullscreen });
    });
    const modalEventSub = modalEvent.subscribe(modalEventSubscriber);

    return () => {
      appEventSub();
      modalEventSub();
      pageSub();
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
          // id: x.id TODO - send component params
        });
      } else if (x.path && x.isShow && !modals.find((y) => y.path == x.path)) {
        // modals = [x];
        modals = [...modals, x];
        if ($view.isPortrait) toasts.reset();
        postDataToParent(EmbedDataMessage.ENABLE_GESTURE_NAVIGATION, false);
      }
      logger.log({ modals });
    }
  });
  function resolvePop(resourceId: string) {
    if (!resourceId) return;
    const slug = resourceId.split(":")[0];
    const action = appStore.resolveAction(slug);
    if (!action) return;
    pop = {
      path: slug,
      resource: resourceId,
      modalParams: {
        ...action.modalParams
      }
    };
  }

  const visibilityChangeListener = () => {
    isWindowVisible = !document.hidden;
  };

  function handleFocusMode(e: CustomEvent<boolean>) {
    if (typeof e.detail === "boolean") {
      isInFocusMode = e.detail;
    }
  }
</script>

<!-- {#if $appStore.fullScreenComponentPath}
  <div
    class="fixed left-0 top-0 w-full h-full flex flex-col z-40"
    transition:fly={{ y: 200, duration: 100 }}
  >
    <ComponentResolver path={$appStore.fullScreenComponentPath} />
  </div>
{/if} -->
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

<!-- {#if $appStore.appData?.bottomRightAction && !$view.isPortrait}
  <div class="fixed bottom-0 right-0 mr-6 mb-6">
    <Button
      icon={$appStore.appData?.bottomRightAction}
      type={ButtonVariant.PRIMARY}
      on:click={() => {
        appStore.runAction($appStore.appData?.bottomRightAction);
      }}
    />
  </div>
{/if} -->

{#if !$view.isPortrait && (isValidArrayWithData($toasts) || $player.isMiniOn)}
  <div
    class={cn(
      "fixed bottom-0 right-0 mb-6 mr-6 flex flex-col items-end gap-4",
      {
        "z-[100]": !$fullScreen.path,
        "z-40": $fullScreen.path
      }
    )}
  >
    {#if isValidArrayWithData($toasts)}
      <div class="flex flex-col gap-3" transition:slide={{ duration: 200 }}>
        {#each $toasts as toast}
          <ToastNotification notification={toast} />
        {/each}
      </div>
    {/if}
    {#if $player.isMiniOn}
      <!-- Opacity is used as `hidden` or svelte `#if` will impair associated PIP functionality -->
      <div class={cn("player", { "opacity-0": $fullScreen.path })}>
        <ColorLayer>
          <ComponentResolver path={$player.action} />
        </ColorLayer>
      </div>
    {/if}
  </div>
{/if}

{#if isValidArrayWithData($toasts) && $view.isPortrait}
  <div
    class={cn(
      "fixed bottom-0 left-0 mx-6 flex flex-col justify-center w-full gap-4 z-[100]",
      {
        // "mb-8": isAppMenuHidden,
        "mb-[10.5rem]": $player.isMiniOn,
        "mb-24": $view.isPortrait
      }
    )}
    transition:slide={{ duration: 200, axis: "x" }}
  >
    {#each $toasts as toast}
      <ToastNotification notification={toast} />
    {/each}
  </div>
{/if}
{#key fullscreen}
  {#if fullscreen}
    <Modal
      show={fullscreen != undefined}
      id={fullscreen + "-focus"}
      isDismissable={true}
      isShowOverlay={true}
      isUseDialog={false}
      size={Size.full}
    >
      <ModalLayout path={fullscreen} params={{ layout: { size: Size.full } }}>
        <SplitView
          id={fullscreen}
          componentParams={{
            isModal: true,
            accessMode: ResourceAccessMode.FULL
          }}
        />
      </ModalLayout>
    </Modal>
  {/if}
{/key}
{#key pop?.resource}
  {#if pop}
    <Modal
      show={pop != undefined}
      id={pop.path + "-resource"}
      {isInFocusMode}
      isDismissable={pop.modalParams?.isDismissable ?? true}
      isShowOverlay={pop.modalParams?.isShowOverlay ?? true}
      isDynamicSize={pop.modalParams?.layout?.isDynamicSize}
      isUseDialog={pop.modalParams?.layout?.size != Size.full &&
        $context.embed != Embed.HANDSET &&
        isDialogEnabled}
      size={pop.modalParams?.layout?.size ?? Size.md}
      orientation={pop.modalParams?.layout?.orientation ??
        Orientation.Horizontal}
      hasCantileverButtons={pop.modalParams?.layout?.isShowCantileverClose ||
        pop.modalParams?.layout?.isShowBackButton}
    >
      <ModalLayout
        path={pop.path + "-resource"}
        resource={pop.resource}
        {isInFocusMode}
        params={{
          ...pop?.modalParams,
          layout: {
            ...pop.modalParams?.layout,
            isShowCantileverClose:
              pop.modalParams?.layout?.isShowCantileverClose,
            isShowBackButton: pop.modalParams?.layout?.isShowBackButton
          }
        }}
      >
        <SplitView
          id={pop.resource}
          componentParams={{
            isModal: true,
            accessMode: ResourceAccessMode.POP
          }}
        />
      </ModalLayout>
    </Modal>
  {/if}
{/key}
{#each modals as modal, index (modal.path)}
  <Modal
    show={modal.isShow}
    id={modal.path}
    {index}
    {isInFocusMode}
    isDismissable={modal.isDismissable ?? true}
    isShowOverlay={modal.isShowOverlay ?? true}
    isUseDialog={modal.layout?.size != Size.full &&
      $context.embed != Embed.HANDSET &&
      isDialogEnabled}
    size={modal.layout?.size ?? Size.md}
    isDynamicSize={modal.layout?.isDynamicSize}
    orientation={modal.layout?.orientation ?? Orientation.Vertical}
    isOnRight={modal?.isOnRight}
    alignment={modal.layout?.alignment}
    hasCantileverButtons={modal.layout?.isShowCantileverClose ||
      modal.layout?.isShowBackButton}
  >
    <ModalLayout path={modal.path} {isInFocusMode} bind:params={modal}>
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

<svelte:document on:visibilitychange={visibilityChangeListener} />
<svelte:window on:focusMode={handleFocusMode} />
