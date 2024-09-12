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
  import PinnedTopBar from "$lib/client/layout/topNav/PinnedTopBar.svelte";
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import ResourceResolver from "$lib/client/layout/paint/ResourceResolver.svelte";
  import ProductBaseLayer from "$lib/client/layout/layers/ProductBaseLayer.svelte";
  let isLiteMode = $context.isEmbed && $context.isSheet;
  $: topBarResourceId = $page.url.searchParams.get(
    ResourceAccessMode.TOPBARFOCUS
  );
  onMount(async () => {
    if ($account.isCloudUser) await initializeData();
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

<ProductBaseLayer>
  {#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
    <div class="flex flex-col w-full h-full">
      <div class="flex w-full flex-grow">
        <!-- {#if !topBarResourceId} -->
        <MemotronLeftNav />
        <!-- {/if} -->
        <div
          class="flex flex-col h-full {$view.isPortrait
            ? 'w-full'
            : 'flex-grow'}"
        >
          {#if !$view.isPortrait}
            <PinnedTopBar />
          {/if}
          <div class="w-full flex-grow">
            <AppSplitView>
              <slot name="main" slot="main">
                {#if topBarResourceId}
                  {#key topBarResourceId}
                    <ResourceResolver id={topBarResourceId} />
                  {/key}
                {:else}
                  <slot />
                {/if}
              </slot>
            </AppSplitView>
          </div>
        </div>
        <!-- <RightPanel /> -->
      </div>
    </div>
  {/if}
  <MemotronNotifications />
</ProductBaseLayer>
<svelte:document on:visibilitychange={handleVisibilityChange} />
