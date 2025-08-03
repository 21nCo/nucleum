<script lang="ts">
  import Notifications from "./Notifications.svelte";
  import { onMount } from "svelte";
  import {
    activeSession,
    focusItemsStore
  } from "$lib/client/products/pointron/focus/session.store";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import BackgroundSoundPlayer from "$lib/client/products/pointron/focus/backgroundMusic/BackgroundSoundPlayer.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import context from "$lib/client/stores/context.store";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { fullScreen } from "$lib/client/components/modal/modal.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import SessionTitle from "./SessionTitle.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
  import { collectionsListOnRecords, nestedGoalCorrection } from "./fallbacks";
  import { FallbackTracker } from "$lib/client/utils/fallbackTracker.utils";
  import FocusTopNavWidget from "../focus/player/FocusTopNavWidget.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { Product } from "$lib/client/products/product.type";

  let isLiteMode = $context.isEmbed && $context.isSheet;
  const isDebug = import.meta.env?.DEV;

  onMount(() => {
    initializeData();
    return () => {
      activeSession.clearIntervals();
    };
  });

  async function initializeData() {
    if (isLiteMode) return;
    if ($activeSession?.isSessionRunning) {
      fullScreen.show(PointronAction.FULL_SCREEN_FOCUS);
    }
  }

  function onAppear() {
    if (
      $activeSession.state === SessionState.FINISHED ||
      $activeSession.state === SessionState.PRE_FINISHED
    ) {
      appStore.runAction(PointronEvent.SESSION_FINISHED);
    }
  }

  async function onReady() {
    if (isLiteMode) return;
    if (!isDebug) await runFallbacks();
    const state = uiState.getState(UIState.recentFocusItems);
    if (state) {
      await focusItemsStore.refreshRecents(state);
    }
    $appLoadingState.isLocalLoaded = true;
  }

  async function runFallbacks() {
    try {
      await FallbackTracker.runIfNotCompleted(
        "nestedGoalCorrection",
        nestedGoalCorrection
      );
      await FallbackTracker.runIfNotCompleted(
        "collectionsListOnRecords",
        collectionsListOnRecords
      );
    } catch (e) {
      logger.error({ at: "runFallbacks", error: e });
    }
  }
</script>

<UserBaseLayer on:ready={onReady}>
  <div slot="topnav">
    <FocusTopNavWidget ctx={Product.POINTRON} />
  </div>
  <slot />
  <SessionTitle ctx={Product.POINTRON} />
  <Notifications />
  <BackgroundSoundPlayer />
</UserBaseLayer>
<svelte:window on:focus={onAppear} />
