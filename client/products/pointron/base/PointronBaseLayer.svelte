<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import Notifications from "@21n/products/pointron/base/Notifications.svelte";
  import { onMount } from "svelte";
  import {
    activeSession,
    focusItemsStore
  } from "@21n/products/pointron/focus/session.store";
  import { appLoadingState, appStore } from "@21n/stores/app.store";
  import BackgroundSoundPlayer from "@21n/products/pointron/focus/backgroundMusic/BackgroundSoundPlayer.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import context from "@21n/stores/context.store";
  import UserBaseLayer from "@21n/layout/layers/UserBaseLayer.svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { fullScreen } from "@21n/components/modal/modal.store";
  import { UIState } from "@21n/stores/uiState/uiState.type";
  import SessionTitle from "@21n/products/pointron/base/SessionTitle.svelte";
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import { PointronEvent } from "@21n/types/pointron/pointronEvent.enum";
  import FocusTopNavWidget from "@21n/products/pointron/focus/player/FocusTopNavWidget.svelte";
  import { Product } from "@21n/products/product.type";
  let { children }: { children?: Snippet } = $props();
  let isLiteMode = $state($context.isEmbed && $context.isSheet);
  const isDebug = import.meta.env?.DEV;

  onMount(() => {
    initializeData();
    window.addEventListener("focus", onAppear);
    return () => {
      activeSession.clearIntervals();
      window.removeEventListener("focus", onAppear);
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
    const state = uiState.getState(UIState.recentFocusItems);
    if (state) {
      await focusItemsStore.refreshRecents(state);
    }
    $appLoadingState.isLocalLoaded = true;
  }
</script>

<UserBaseLayer onReady={onReady}>
  {#snippet topnav()}
    <div class="flex gap-1 items-center h-full">
      <FocusTopNavWidget />
    </div>
  {/snippet}
  {@render children?.()}
  <SessionTitle ctx={Product.POINTRON} />
  <Notifications />
  <BackgroundSoundPlayer />
</UserBaseLayer>
