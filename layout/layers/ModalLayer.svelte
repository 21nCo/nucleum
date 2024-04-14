<script lang="ts">
  import Modal from "$lib/tidy/components/modal/Modal.svelte";
  import { appEvents, appStore } from "$lib/tidy/stores/app.store";
  import view from "$lib/tidy/stores/view.store";
  import modalEvent from "$lib/tidy/components/modal/modal.store";
  import {
    toasts,
    confirmationNotification,
    fullPageLoadingScreen
  } from "$lib/tidy/stores/notification.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { fly, slide } from "svelte/transition";
  import ComponentResolver from "../paint/ComponentResolver.svelte";
  import WithYStack from "../paint/painters/YStack/WithYStack.svelte";
  import { onMount } from "svelte";
  import type { ModalEvent } from "$lib/tidy/types/popup.type";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { postToParent } from "$lib/tidy/utils/embed.utils";
  import ToastNotification from "$lib/tidy/elements/feedback/ToastNotification.svelte";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import ModalLayout from "$lib/tidy/components/modal/ModalLayout.svelte";
  import PageLoadingAnimation from "$lib/tidy/elements/feedback/animations/PageLoadingAnimation.svelte";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { runAction } from "$lib/tidy/utils/utils";
  import { SelectionItemActiveStyle } from "$lib/tidy/types/switcher.enum";
  import Button from "$lib/tidy/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/tidy/types/button.type";
  import { logger } from "$lib/tidy/stores/log.store";
  import { dataManager } from "$lib/tidy/stores/data.store";
  import { liveQuery } from "dexie";
  import { AlertType } from "$lib/tidy/types/notification.type";

  let modals: ModalEvent[] = [];
  let dialogRef: HTMLDialogElement;
  let isShowAppearancePreview: boolean = false;
  $: if (dialogRef) dialogRef.showModal();
  //TODO offline mode detection and showing changes pending sync
  let mutationQueue = liveQuery(() =>
    $dataManager.cacheSource.dexie.mutationQueue.toArray()
  );
  onMount(() => {
    const appEventSub = appEvents.subscribe((x: AppEventType) => {
      if (x.event == AppEvent.SHOW_APPEARANCE_PREVIEW) {
        isShowAppearancePreview = x.value ?? false;
      } else if (x.event === AppEvent.USER_LOGIN) {
        modals = [];
      }
    });
    const modalEventSub = modalEvent.subscribe((x: ModalEvent) => {
      if (!x.isShow) {
        modals = modals.filter((y) => y.path != x.path);
        postToParent({
          pop: JSON.stringify(x)
        });
      } else if (
        $appStore.launchContext == LaunchContext.EMBED &&
        x.isShowAsSheet
      ) {
        postToParent({
          pop: JSON.stringify({
            isShow: x.isShow,
            path: x.path
            // id: x.id TODO - send component params
          })
        });
      } else if (x.path && x.isShow && !modals.find((y) => y.path == x.path)) {
        // modals = [x];
        modals = [...modals, x];
      }
      logger.log({ modals });
    });
    () => {
      appEventSub();
      modalEventSub();
    };
  });
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
{#if $appStore.player && !$view.isPortrait}
  <div class="fixed bottom-0 right-0">
    <ComponentResolver path={$appStore.player} />
  </div>
{/if}
{#if $appStore.appData?.bottomRightAction && !$view.isPortrait}
  <div class="fixed bottom-0 right-0 mr-6 mb-6">
    <Button
      icon={$appStore.appData?.bottomRightAction}
      type={ButtonVariant.PRIMARY}
      style={ButtonStyle.ROUNDED}
      on:click={() => {
        runAction($appStore.appData?.bottomRightAction);
      }}
    />
  </div>
{/if}

{#if (isValidArrayWithData($toasts) || isValidArrayWithData($mutationQueue)) && !$view.isPortrait}
  <div
    class="fixed bottom-0 right-0 mb-6 mr-20 flex flex-col gap-4 z-[100]"
    transition:slide={{ duration: 200 }}
  >
    {#each $toasts as toast}
      <ToastNotification notification={toast} />
    {/each}
    {#if isValidArrayWithData($mutationQueue)}
      <ToastNotification
        notification={{
          id: "syncNotification",
          type: AlertType.WARNING,
          message:
            $mutationQueue.length +
            ($mutationQueue.length === 1 ? " change" : " changes") +
            " pending sync",
          title: "Sync error - we're sorry!",
          actionText: "Sync manually",
          callback: () => {
            dataManager.syncPendingMutations();
          },
          isHideClose: true
        }}
      />
    {/if}
  </div>
{/if}

<!-- <Modal
  size={Size.xl}
  show={isShowAppearancePreview}
  isOnRight={true}
  isShowOverlay={false}
  title={"Appearance"}
>
  <WithYStack
    path={"settings/appearance"}
    params={{ parentBackgroundIndex: 2, hidePageHeading: true }}
  />
</Modal> -->

{#each modals as modal (modal.path)}
  <Modal
    show={modal.isShow}
    id={modal.path}
    isDismissable={modal.isDismissable ?? true}
    isUseDialog={modal.layout?.size != Size.full}
    size={modal.layout?.size ?? Size.md}
    orientation={modal.layout?.orientation}
  >
    <ModalLayout path={modal.path} bind:params={modal}>
      <ComponentResolver
        path={modal.path}
        params={{ ...modal.componentParams }}
      />
    </ModalLayout>
  </Modal>
{/each}

{#if $confirmationNotification}
  <Modal show={true} id="confirmation" isDismissable={true} size={Size.xs}>
    <ModalLayout
      path={AppEvent.CONFIRMATION}
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
