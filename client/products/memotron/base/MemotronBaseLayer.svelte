<script lang="ts">
  import { appLoadingState } from "@21n/stores/app.store";
  import { toasts } from "@21n/stores/notification.store";
  import context from "@21n/stores/context.store";
  import MemotronNotifications from "@21n/products/memotron/base/MemotronNotifications.svelte";
  import UserBaseLayer from "@21n/layout/layers/UserBaseLayer.svelte";
  import {
    clipTextSearchFallback,
    collectionResourceBackPropagation,
    headingNodeParentBackPropagation,
    collectionsListOnRecords,
    lowResThumbnailsBackPropagation
  } from "@21n/products/memotron/base/fallbacks";
  import { logger } from "@21n/components/debug/logger.client";
  import { FallbackTracker } from "@21n/utils/fallbackTracker.utils";
  import { dispatchCustomEvent } from "@21n/utils/browser.utils";
  import { GlobalEvent } from "@21n/types/event.enum";
  import MemoryBase from "@21n/products/memotron/base/MemoryBase.svelte";
  import { defaultsMigrationForNodes } from "@21n/products/memotron/base/migrations";
  import { defaultsMigrationTidy } from "@21n/components/migrations";

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
