<script lang="ts">
  import Modal from "$lib/tidy/components/modal/Modal.svelte";
  import {
    appEvents,
    appStore,
    modalEvent as modalEvent,
  } from "$lib/tidy/stores/app.store";
  import { Size } from "$lib/tidy/types/size.enum";
  import { fly } from "svelte/transition";
  import ComponentResolver from "../paint/ComponentResolver.svelte";
  import WithYStack from "../paint/painters/YStack/WithYStack.svelte";
  import { swipe } from "svelte-gestures";
  import { onMount } from "svelte";
  import type { ModalEvent } from "$lib/tidy/types/popup.type";
  import { LaunchContext } from "$lib/tidy/types/appStore.type";
  import { AppEvent } from "$lib/tidy/types/event.enum";
  import type { AppEventType } from "$lib/tidy/types/event.type";
  import { postToParent } from "$lib/tidy/utils/embed.utils";
  let modals: ModalEvent[] = [];
  let dialogRef: HTMLDialogElement;
  let isShowAppearancePreview: boolean = false;
  function onSwipe(event: any) {
    appStore.log({ event });
  }
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
        !x.isNonSheetModal
      ) {
        appStore.log("is embed");
        postToParent({
          pop: JSON.stringify(x),
        });
      } else if (x.path && x.isShow && !modals.find((y) => y.path == x.path)) {
        modals = [x];
      }
      appStore.log({ modals });
      console.log({ modals });
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
    use:swipe={{ timeframe: 300, minSwipeDistance: 60 }}
    on:swipe={onSwipe}
  >
    <ComponentResolver path={$appStore.fullScreenComponentPath} />
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
{#each modals as modal}
  <Modal show={modal.isShow} id={modal.path}>
    <ComponentResolver
      path={modal.path}
      params={{ id: modal.id, path: modal.path }}
    />
  </Modal>
{/each}
