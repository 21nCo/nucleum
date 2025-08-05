<script lang="ts">
  import { appLoadingState } from "$lib/client/stores/app.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import MemotronNotifications from "./MemotronNotifications.svelte";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
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
  import MemoryBase from "./MemoryBase.svelte";
  import { defaultsMigrationForNodes } from "./migrations";
  import { defaultsMigrationTidy } from "$lib/client/components/migrations";

  let isLiteMode = $context.isEmbed && $context.isSheet;
  const isDebug = import.meta.env?.DEV;

  async function onUserBaseLayerReady() {
    if (isLiteMode) return;
    if (!isDebug) await runFallbacks();
    $appLoadingState.isLocalLoaded = true;
  }

  async function runFallbacks() {
    let runs = 0;
    try {
      await defaultsMigrationTidy();
      await defaultsMigrationForNodes();
      runs += await FallbackTracker.runIfNotCompleted(
        "clipTextSearchFallback",
        clipTextSearchFallback
      );
      runs += await FallbackTracker.runIfNotCompleted(
        "collectionResourceBackPropagation",
        collectionResourceBackPropagation
      );
      runs += await FallbackTracker.runIfNotCompleted(
        "headingNodeParentBackPropagation",
        headingNodeParentBackPropagation
      );
      await collectionsListOnRecords();
      if (!$context.isEmbed) {
        runs += await FallbackTracker.runIfNotCompleted(
          "lowResThumbnailsBackPropagation",
          lowResThumbnailsBackPropagation
        );
      }
      // await migrateTo0_56_0();
    } catch (error) {
      logger.error({ at: "runFallbacks", error });
    } finally {
      toasts.closeProgress("update");
      if (runs > 0) {
        dispatchCustomEvent(GlobalEvent.APP_LOADING_STATUS, {
          message: "Update completed",
          subMessage: "",
          isFinished: true
        });
      }
    }
  }
</script>

<UserBaseLayer on:ready={onUserBaseLayerReady}>
  <slot />
  <MemotronNotifications />
</UserBaseLayer>
<MemoryBase />
