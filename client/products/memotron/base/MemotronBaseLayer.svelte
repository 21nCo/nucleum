<script lang="ts">
  import { onMount } from "svelte";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import {
    scheduledNotifications,
    toasts
  } from "$lib/client/stores/notification.store";
  import {
    postMessageToParent,
    postToParent
  } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import context from "$lib/client/stores/context.store";
  import view from "$lib/client/stores/view.store";
  import AppSplitView from "$lib/client/layout/AppSplitView.svelte";
  import MemotronNotifications from "./MemotronNotifications.svelte";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
  import { MemotronAction } from "../memotronAction.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { InteractionMode } from "$lib/client/components/settings/interactionMode/interactionMode.type";
  import { Embed } from "$lib/client/types/context.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import CommandModePage from "$lib/client/components/commandBar/CommandModePage.svelte";
  import {
    clipTextSearchFallback,
    collectionResourceBackPropagation,
    headingNodeParentBackPropagation,
    collectionsListOnRecords,
    lowResThumbnailsBackPropagation
  } from "./fallbacks";
  import LeftNav from "$lib/client/layout/leftPanel/LeftNav.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import TopNav from "$lib/client/layout/topNav/TopNav.svelte";
  let isLiteMode = $context.isEmbed && $context.isSheet;
  let isHideLeftNavBar: boolean = refreshSidebarState();
  const isDebug = import.meta.env?.DEV;

  onMount(async () => {
    initializeData();
    $appLoadingState.isLocalLoaded = true;
  });
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
  async function initializeData() {
    if (isLiteMode) return;
  }
  function refreshSidebarState() {
    return uiState.getState(UIState.isHideLeftNavBar);
  }

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
    if (!isDebug) await runFallbacks();
  }
  async function runFallbacks() {
    try {
      await clipTextSearchFallback();
      await collectionResourceBackPropagation();
      await headingNodeParentBackPropagation();
      await collectionsListOnRecords();
      if (!$context.isEmbed) {
        toasts.showProgress("update", "Updating the app");
        await lowResThumbnailsBackPropagation();
      }
      // await migrateTo0_56_0();
    } catch (error) {
      logger.error({ at: "lowResThumbnailsBackPropagation", error });
    } finally {
      toasts.closeProgress("update");
    }
  }
</script>

<UserBaseLayer on:ready={onUserBaseLayerReady}>
  {#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
    {#if $appStore.interactionMode === InteractionMode.COMMAND_ONLY && $context.embed !== Embed.HANDSET}
      <CommandModePage>
        <slot />
      </CommandModePage>
    {:else}
      <div class="flex flex-col w-full h-full">
        <div class="flex w-full flex-grow">
          {#if !isHideLeftNavBar || $appStore.interactionMode === InteractionMode.DEFAULT || $context.embed === Embed.HANDSET}
            <LeftNav variant="fixed" />
          {/if}
          <div
            class="flex flex-col h-full {$view.isPortrait
              ? 'w-full'
              : 'flex-grow'}"
          >
            {#if !$view.isPortrait}
              <TopNav />
            {/if}
            <div class="w-full flex-grow">
              <AppSplitView>
                <slot name="main" slot="main">
                  <slot />
                </slot>
              </AppSplitView>
            </div>
          </div>
          <!-- <RightPanel /> -->
        </div>
      </div>
    {/if}
  {/if}
  <MemotronNotifications />
</UserBaseLayer>
<svelte:document
  on:visibilitychange={handleVisibilityChange}
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
/>
<svelte:window on:paste={handlePaste} />
