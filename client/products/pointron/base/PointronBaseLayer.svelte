<script lang="ts">
  import Notifications from "./Notifications.svelte";
  import { onMount } from "svelte";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import account from "$lib/client/stores/account.store";
  import {
    appEvents,
    scheduledNotifications
  } from "$lib/client/stores/notification.store";
  import { GlobalEvent } from "$lib/client/types/event.enum";

  import { postToParent } from "$lib/client/utils/embed.utils";
  import BackgroundSoundPlayer from "$lib/client/products/pointron/focus/backgroundMusic/BackgroundSoundPlayer.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import context from "$lib/client/stores/context.store";
  import LocalLeftNav from "./LocalLeftNav.svelte";
  import view from "$lib/client/stores/view.store";
  import BaseLayer from "$lib/client/layout/layers/BaseLayer.svelte";
  import { InteractionMode } from "$lib/client/components/settings/interactionMode/interactionMode.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import CommandModePage from "$lib/client/components/commandBar/CommandModePage.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { Embed } from "$lib/client/types/context.type";
  import { fullScreen } from "$lib/client/components/modal/modal.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  let isLiteMode = $context.isEmbed && $context.isSheet;
  let interactionMode: InteractionMode;
  let isHideLeftNavBar: boolean = refreshSidebarState();
  onMount(async () => {
    if ($account.isCloudUser) await initializeData();
    const appEventSub = appEvents.subscribe(async (e) => {
      if (isLiteMode) return;
      if (e.event === GlobalEvent.USER_LOGIN) {
        if (!e.value) sessionStore.loadEmptyState();
      }
    });
    const uiStateSub = uiState.subscribe(() => {
      refreshInteractionModeState();
      isHideLeftNavBar = refreshSidebarState();
    });
    $appLoadingState.isLocalLoaded = true;
    return () => {
      sessionStore.clearIntervals();
      appEventSub();
      uiStateSub();
    };
  });
  function refreshSidebarState() {
    return uiState.getState(UIState.isHideLeftNavBar);
  }
  async function initializeData() {
    if (isLiteMode) return;
    if ($sessionStore?.isSessionRunning) {
      fullScreen.show(PointronAction.FULL_SCREEN_FOCUS);
    }
    refreshInteractionModeState();
  }
  function refreshInteractionModeState() {
    interactionMode = uiState.getState(Action.MODE_OF_INTERACTION, {
      isProductScoped: true
    });
  }
  async function handleVisibilityChange() {
    if (document?.hidden) {
      const registration = await navigator?.serviceWorker?.ready;
      if ($scheduledNotifications.length > 0) {
        registration?.active?.postMessage({
          type: "SCHEDULE_NOTIFICATIONS",
          notifications: $scheduledNotifications
        });
        postToParent({
          notifications: $scheduledNotifications
        });
      }
    } else {
      scheduledNotifications.reset();
      navigator?.serviceWorker?.controller?.postMessage({
        type: "CLEAR_NOTIFICATIONS"
      });
    }
  }
</script>

<BaseLayer>
  {#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
    <!-- TODO - except touch devices -->
    {#if interactionMode === InteractionMode.COMMAND_ONLY && $context.embed !== Embed.HANDSET}
      <CommandModePage />
    {:else}
      {#if !isHideLeftNavBar || interactionMode === InteractionMode.DEFAULT || $context.embed === Embed.HANDSET}
        <LocalLeftNav />
      {/if}
      <div
        class="flex flex-col h-full {$view.isPortrait ? 'w-full' : 'flex-grow'}"
      >
        <slot />
      </div>
      <!-- <RightPanel /> -->
    {/if}
  {/if}
  <Notifications />
  <BackgroundSoundPlayer />
</BaseLayer>
<svelte:document on:visibilitychange={handleVisibilityChange} />
