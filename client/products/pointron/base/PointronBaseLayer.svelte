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
  import { PointronPersistence } from "$lib/client/products/pointron/pointron.persistence";
  import { pointronPreferences } from "$lib/client/products/pointron/pointron.store";
  import LocalLeftNav from "./LocalLeftNav.svelte";
  import view from "$lib/client/stores/view.store";
  const localPersistance = new PointronPersistence();
  let isLiteMode = $context.isEmbed && $context.isSheet;
  onMount(async () => {
    if ($account.isLoggedIn) await initializeData();
    const appEventSub = appEvents.subscribe(async (e) => {
      if (isLiteMode) return;
      if (e.event === GlobalEvent.USER_LOGIN) {
        if (!e.value) sessionStore.loadEmptyState();
      } else if (e.event === GlobalEvent.USER_SIGNUP) {
        sessionStore.loadEmptyState();
        pointronPreferences.loadSeedData();
        localPersistance.syncSeedDataToCloud();
      }
    });
    $appLoadingState.isLocalLoaded = true;
    return () => {
      sessionStore.clearIntervals();
      appEventSub();
    };
  });
  async function initializeData() {
    if (isLiteMode) return;
    if ($sessionStore?.isSessionRunning) {
      appStore.showFullScreenPlayer(PointronAction.FULL_SCREEN_FOCUS);
    }
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

{#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
  <LocalLeftNav />
  <div class="flex flex-col h-full {$view.isPortrait ? 'w-full' : 'flex-grow'}">
    <slot />
  </div>
  <!-- <RightPanel /> -->
{/if}
<Notifications />
<BackgroundSoundPlayer />
<svelte:document on:visibilitychange={handleVisibilityChange} />
