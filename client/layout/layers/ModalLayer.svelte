<script lang="ts">
  import Modal from "$lib/client/components/modal/Modal.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import modalEvent, { player } from "$lib/client/components/modal/modal.store";
  import {
    toasts,
    confirmationNotification,
    fullPageLoadingScreen,
    appEvents
  } from "$lib/client/stores/notification.store";
  import { Size } from "$lib/client/types/size.enum";
  import { fly, slide } from "svelte/transition";
  import ComponentResolver from "../paint/ComponentResolver.svelte";
  import { onMount } from "svelte";
  import type { ModalEvent, ModalParams } from "$lib/client/types/popup.type";
  import { GlobalEvent } from "$lib/client/types/event.enum";
  import type { IEvent } from "$lib/client/types/event.type";
  import { postToParent } from "$lib/client/utils/embed.utils";
  import ToastNotification from "$lib/client/elements/feedback/ToastNotification.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import ModalLayout from "$lib/client/components/modal/ModalLayout.svelte";
  import PageLoadingAnimation from "$lib/client/elements/feedback/animations/PageLoadingAnimation.svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { liveQuery } from "dexie";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  import SplitView from "../SplitView.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import ColorLayer from "./themeLayer/ColorLayer.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { cn } from "$lib/client/utils/ui.utils";

  let modals: ModalEvent[] = [];
  let dialogRef: HTMLDialogElement;
  let isShowAppearancePreview: boolean = false;
  let fullscreen: string | undefined;
  let pop: { path: string; resource: string; params: ModalParams } | undefined;
  $: if (dialogRef) dialogRef.showModal();
  //TODO offline mode detection and showing changes pending sync
  let isShowSyncErrorMessage: boolean = false;
  let mutationQueue = refreshMutationQueueLiveQuery();
  let isWindowVisible: boolean = true;
  let isDialogEnabled: boolean = false;
  function refreshMutationQueueLiveQuery() {
    return liveQuery(() =>
      $dataManager.cacheSource.dexie.mutationQueuev2.toArray()
    );
  }

  onMount(() => {
    const appEventSub = appEvents.subscribe((x: IEvent) => {
      if (x.event == GlobalEvent.SHOW_APPEARANCE_PREVIEW) {
        isShowAppearancePreview = x.value ?? false;
      } else if (x.event === GlobalEvent.USER_LOGIN) {
        modals = [];
      }
      if (
        x.event === GlobalEvent.USER_SIGNUP ||
        x.event === GlobalEvent.USER_LOGIN
      ) {
        mutationQueue = refreshMutationQueueLiveQuery();
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
        value.url.searchParams.get(ResourceAccessMode.FOCUS) ?? undefined;
      // console.log({ pop, fullscreen });
    });
    const modalEventSub = modalEvent.subscribe(modalEventSubscriber);

    () => {
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
        postToParent({
          modal: JSON.stringify(x)
        });
      } else if (
        $context.isEmbed &&
        $context.embed === Embed.HANDSET &&
        x.isShowAsSheet
      ) {
        postToParent({
          modal: JSON.stringify({
            isShow: x.isShow,
            path: x.path,
            title: x.title,
            params: x.componentParams
            // id: x.id TODO - send component params
          })
        });
      } else if (x.path && x.isShow && !modals.find((y) => y.path == x.path)) {
        // modals = [x];
        modals = [...modals, x];
        if ($view.isPortrait) toasts.reset();
      }
      logger.log({ modals });
    }
  });
  function resolvePop(resourceId: string) {
    if (resourceId && resourceId.split(":").length > 1) {
      const slug = resourceId.split(":")[0];
      const action = appStore.resolveAction(slug);
      if (!action) return;
      pop = {
        path: slug,
        resource: resourceId,
        params: {
          ...action.modalParams
        }
      };
    }
  }

  const visibilityChangeListener = () => {
    isWindowVisible = !document.hidden;
  };
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
    class="fixed bottom-0 right-0 mr-6 mb-6 flex flex-col items-end gap-4 z-[100]"
  >
    {#if isValidArrayWithData($toasts)}
      <div class="flex flex-col gap-3" transition:slide={{ duration: 200 }}>
        {#each $toasts as toast}
          <ToastNotification notification={toast} />
        {/each}
      </div>
    {/if}
    {#if $player.isMiniOn}
      <div class="player">
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

{#each modals as modal, index (modal.path)}
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
    orientation={modal.layout?.orientation ?? Orientation.Vertical}
  >
    <ModalLayout path={modal.path} bind:params={modal}>
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
    size={Size.xs}
  >
    <ModalLayout
      path={Action.CONFIRMATION}
      params={{
        title: $confirmationNotification.title,
        layout: {
          size: Size.xs,
          primaryAction: $confirmationNotification.confirmAction,
          secondaryAction: $confirmationNotification.cancelAction ?? {
            label: "Cancel"
          }
        }
      }}
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="text-b1">{$confirmationNotification?.message}</div>
        </div>
      </div>
    </ModalLayout>
  </Modal>
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
            accessMode: ResourceAccessMode.FOCUS
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
      id={pop.path + "-pop"}
      isDismissable={pop.params?.isDismissable ?? true}
      isShowOverlay={pop.params?.isShowOverlay ?? true}
      isUseDialog={pop.params?.layout?.size != Size.full &&
        $context.embed != Embed.HANDSET &&
        isDialogEnabled}
      size={pop.params?.layout?.size ?? Size.md}
      orientation={pop.params?.layout?.orientation ?? Orientation.Horizontal}
    >
      <ModalLayout
        path={pop.path}
        resource={pop.resource}
        params={{
          ...pop?.params,
          layout: { ...pop.params?.layout, isShowCantileverClose: true }
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

<svelte:document on:visibilitychange={visibilityChangeListener} />
