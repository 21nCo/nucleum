<script lang="ts">
  import { onMount } from "svelte";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import { scheduledNotifications } from "$lib/client/stores/notification.store";
  import {
    postMessageToParent,
    postToParent
  } from "$lib/client/utils/embed.utils";
  import { EmbedMessage } from "$lib/client/types/embedMessage.enum";
  import context from "$lib/client/stores/context.store";
  import view from "$lib/client/stores/view.store";
  import AppSplitView from "$lib/client/layout/AppSplitView.svelte";
  import MemotronNotifications from "./MemotronNotifications.svelte";
  import Tabs from "$lib/client/layout/tabs/Tabs.svelte";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
  import { MemotronAction } from "../memotronAction.enum";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  import { InteractionMode } from "$lib/client/components/settings/interactionMode/interactionMode.type";
  import { Embed } from "$lib/client/types/context.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import { Action } from "$lib/client/types/action.enum";
  import CommandModePage from "$lib/client/components/commandBar/CommandModePage.svelte";
  import { clipTextSearchFallback } from "./fallbacks";
  import LeftNav from "$lib/client/layout/leftPanel/LeftNav.svelte";
  let isLiteMode = $context.isEmbed && $context.isSheet;
  let interactionMode: InteractionMode;
  let isHideLeftNavBar: boolean = refreshSidebarState();

  onMount(async () => {
    initializeData();
    const uiStateSub = uiState.subscribe(() => {
      refreshInteractionModeState();
      isHideLeftNavBar = refreshSidebarState();
    });
    $appLoadingState.isLocalLoaded = true;
    postMessageToParent(EmbedMessage.MOUNT);
    return () => {
      uiStateSub();
    };
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
    refreshInteractionModeState();
  }
  function refreshSidebarState() {
    return uiState.getState(UIState.isHideLeftNavBar);
  }
  function refreshInteractionModeState() {
    interactionMode = uiState.getState(Action.MODE_OF_INTERACTION, {
      isProductScoped: true
    });
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
    await runFallbacks();
  }
  async function runFallbacks() {
    await clipTextSearchFallback();
    // await migrateTo0_56_0();
  }
</script>

<UserBaseLayer on:ready={onUserBaseLayerReady}>
  {#if $appLoadingState.isBaseLoaded && $appLoadingState.isLocalLoaded}
    {#if interactionMode === InteractionMode.COMMAND_ONLY && $context.embed !== Embed.HANDSET}
      <CommandModePage />
    {:else}
      <div class="flex flex-col w-full h-full">
        <div class="flex w-full flex-grow">
          {#if !isHideLeftNavBar || interactionMode === InteractionMode.DEFAULT || $context.embed === Embed.HANDSET}
            <LeftNav variant="fixed" />
          {/if}
          <div
            class="flex flex-col h-full {$view.isPortrait
              ? 'w-full'
              : 'flex-grow'}"
          >
            {#if !$view.isPortrait}
              <Tabs />
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
