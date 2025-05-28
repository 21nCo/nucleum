<script lang="ts">
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import MemotronNotifications from "./MemotronNotifications.svelte";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
  import { MemotronAction } from "../memotronAction.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import {
    clipTextSearchFallback,
    collectionResourceBackPropagation,
    headingNodeParentBackPropagation,
    collectionsListOnRecords,
    lowResThumbnailsBackPropagation
  } from "./fallbacks";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { FallbackTracker } from "$lib/client/utils/fallbackTracker.utils";
  import { dispatchCustomEvent } from "$lib/client/utils/browser.utils";
  import { GlobalEvent } from "$lib/client/types/event.enum";

  let isLiteMode = $context.isEmbed && $context.isSheet;
  const isDebug = false; //import.meta.env?.DEV;

  function handlePaste(event: ClipboardEvent) {
    if (!$appStore.isDnDPageActive) {
      appStore.runAction(MemotronAction.PASTE_CONFIRMATION, {
        componentParams: {
          event
        }
      });
      event.preventDefault();
    }
  }

  function handleDragEnter(event: DragEvent) {
    if (!event.relatedTarget && !$appStore.isDnDPageActive) {
      appStore.runAction(MemotronAction.CAPTURE_DND);
    }
  }

  function handleDragLeave(event: DragEvent) {
    if (
      !event.relatedTarget &&
      !$appStore.isDnDPageActive &&
      !window.location.pathname.includes("/tab")
    ) {
      appStore.closeResource({
        id: MemotronAction.CAPTURE_DND,
        accessMode: ResourceAccessMode.POP
      });
    }
  }
  async function onUserBaseLayerReady() {
    if (isLiteMode) return;
    if (!isDebug) await runFallbacks();
    $appLoadingState.isLocalLoaded = true;
  }

  async function runFallbacks() {
    try {
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: "Updating the app...",
        subMessage: ""
      });
      await FallbackTracker.runIfNotCompleted(
        "clipTextSearchFallback",
        clipTextSearchFallback
      );
      await FallbackTracker.runIfNotCompleted(
        "collectionResourceBackPropagation",
        collectionResourceBackPropagation
      );
      await FallbackTracker.runIfNotCompleted(
        "headingNodeParentBackPropagation",
        headingNodeParentBackPropagation
      );
      await FallbackTracker.runIfNotCompleted(
        "collectionsListOnRecords",
        collectionsListOnRecords
      );
      if (!$context.isEmbed) {
        toasts.showProgress("update", "Updating the app");
        await FallbackTracker.runIfNotCompleted(
          "lowResThumbnailsBackPropagation",
          lowResThumbnailsBackPropagation
        );
      }
      // await migrateTo0_56_0();
    } catch (error) {
      logger.error({ at: "runFallbacks", error });
    } finally {
      toasts.closeProgress("update");
      dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
        message: "Update completed.",
        subMessage: "",
        isFinished: true
      });
    }
  }
</script>

<UserBaseLayer on:ready={onUserBaseLayerReady}>
  <slot />
  <MemotronNotifications />
</UserBaseLayer>
<svelte:document
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
/>
<svelte:window on:paste={handlePaste} />
