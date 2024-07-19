<script lang="ts">
  import { onMount } from "svelte";
  import { appLoadingState } from "$lib/client/stores/app.store";
  import account from "$lib/client/stores/account.store";
  import { scheduledNotifications } from "$lib/client/stores/notification.store";
  import {
    postMessageToParent,
    postToParent
  } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import context from "$lib/client/stores/context.store";
  import MemotronLeftNav from "./MemotronLeftNav.svelte";
  import view from "$lib/client/stores/view.store";
  import AppSplitView from "$lib/client/layout/AppSplitView.svelte";
  import MemotronNotifications from "./MemotronNotifications.svelte";
  let isLiteMode = $context.isEmbed && $context.isSheet;
  onMount(async () => {
    if ($account.isLoggedIn) await initializeData();
    $appLoadingState.isLocalLoaded = true;
    postMessageToParent(EmbedMessage.MOUNT);
  });
  async function initializeData() {
    if (isLiteMode) return;
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
      postMessageToParent(EmbedMessage.CLEAR_NOTIFICATIONS);
      $scheduledNotifications = [];
      navigator?.serviceWorker?.controller?.postMessage({
        type: "CLEAR_NOTIFICATIONS"
      });
    }
  }
</script>

{#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
  <MemotronLeftNav />
  <div class="flex flex-col h-full {$view.isPortrait ? 'w-full' : 'flex-grow'}">
    <AppSplitView>
      <slot name="main" slot="main">
        <slot />
      </slot>
    </AppSplitView>
  </div>
  <!-- <RightPanel /> -->
{/if}
<MemotronNotifications />
<svelte:document on:visibilitychange={handleVisibilityChange} />
