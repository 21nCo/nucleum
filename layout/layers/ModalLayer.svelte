<script lang="ts">
  import Modal from "$lib/tidy/components/modal/Modal.svelte";
  import {
    appEvents,
    appStore,
    confirmationNotification,
    modalEvent as modalEvent,
    toasts,
    windowObject,
  } from "$lib/tidy/stores/app.store";
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
  import ToastNotification from "$lib/tidy/elements/ToastNotification.svelte";
  import { isValidArray } from "$lib/tidy/utils/obj.utils";
  import ModalLayout from "$lib/tidy/components/modal/ModalLayout.svelte";

  let modals: ModalEvent[] = [];
  let dialogRef: HTMLDialogElement;
  let isShowAppearancePreview: boolean = false;
  $: if (dialogRef) dialogRef.showModal();
  onMount(() => {
    const appEventSub = appEvents.subscribe((x: AppEventType) => {
      if (x.event == AppEvent.SHOW_APPEARANCE_PREVIEW) {
        isShowAppearancePreview = x.value ?? false;
      }
    });
    const modalEventSub = modalEvent.subscribe((x: ModalEvent) => {
      if (!x.isShow) {
        modals = modals.filter((y) => y.path != x.path);
        postToParent({
          pop: JSON.stringify(x),
        });
      } else if (
        $appStore.launchContext == LaunchContext.EMBED &&
        x.isShowAsSheet
      ) {
        appStore.log("is embed");
        postToParent({
          pop: JSON.stringify(x),
        });
      } else if (x.path && x.isShow && !modals.find((y) => y.path == x.path)) {
        modals = [x];
      }
      appStore.log({ modals });
    });
    () => {
      appEventSub();
      modalEventSub();
    };
  });
</script>

{#if $appStore.fullScreenComponentPath}
  <div
    class="fixed left-0 top-0 w-full h-full flex flex-col z-40"
    transition:fly={{ y: 200, duration: 100 }}
  >
    <ComponentResolver path={$appStore.fullScreenComponentPath} />
  </div>
{/if}
{#if $appStore.player && !$windowObject.isInPortraitMode}
  <div class="fixed bottom-0 right-0">
    <ComponentResolver path={$appStore.player} />
  </div>
{/if}

{#if isValidArray($toasts) && !$windowObject.isInPortraitMode}
  <div
    class="fixed top-0 right-0 mr-6 mt-6 drop-shadow z-100 flex flex-col flex-wrap gap-4 h-full"
    transition:slide={{ duration: 200 }}
  >
    {#each $toasts as toast}
      <ToastNotification notification={toast} />
    {/each}
  </div>
{/if}

<Modal
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
</Modal>
{#each modals as modal (modal.path)}
  <Modal
    show={modal.isShow}
    id={modal.path}
    isDismissable={modal.isDismissable ?? true}
  >
    {#if modal.layoutParams}
      <ModalLayout layoutParams={modal.layoutParams} bind:params={modal}>
        <ComponentResolver path={modal.path} params={{ params: modal }} />
      </ModalLayout>
    {:else}
      <ComponentResolver path={modal.path} params={{ params: modal }} />
    {/if}
  </Modal>
{/each}

{#if $confirmationNotification.isShow}
  <Modal show={true} id="confirmation" isDismissable={true}>
    <ModalLayout
      params={{
        path: "confirmation",
        title: $confirmationNotification.title,
        isHideTitleIfEmpty: true,
      }}
      layoutParams={{
        size: Size.xs,
        primaryAction: $confirmationNotification.confirmAction,
        secondaryAction: $confirmationNotification.cancelAction ?? {
          label: "Cancel",
        },
      }}
    >
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-2">
          <div class="text-b1">{$confirmationNotification.message}</div>
        </div>
      </div>
    </ModalLayout>
  </Modal>
{/if}
