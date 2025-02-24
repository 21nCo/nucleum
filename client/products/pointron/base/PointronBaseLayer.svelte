<script lang="ts">
  import Notifications from "./Notifications.svelte";
  import { onMount } from "svelte";
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import { scheduledNotifications } from "$lib/client/stores/notification.store";

  import { postToParent } from "$lib/client/utils/embed.utils";
  import BackgroundSoundPlayer from "$lib/client/products/pointron/focus/backgroundMusic/BackgroundSoundPlayer.svelte";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import context from "$lib/client/stores/context.store";
  import LocalLeftNav from "./LocalLeftNav.svelte";
  import view from "$lib/client/stores/view.store";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
  import { InteractionMode } from "$lib/client/components/settings/interactionMode/interactionMode.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import CommandModePage from "$lib/client/components/commandBar/CommandModePage.svelte";
  import { Action } from "$lib/client/types/action.enum";
  import { Embed } from "$lib/client/types/context.type";
  import { fullScreen } from "$lib/client/components/modal/modal.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import SessionTitle from "./SessionTitle.svelte";
  import LeftNav from "$lib/client/layout/leftPanel/LeftNav.svelte";
  import Tabs from "$lib/client/layout/tabs/Tabs.svelte";
  import AppSplitView from "$lib/client/layout/AppSplitView.svelte";
  let isLiteMode = $context.isEmbed && $context.isSheet;
  let interactionMode: InteractionMode;
  let isHideLeftNavBar: boolean = refreshSidebarState();
  onMount(() => {
    initializeData();
    const uiStateSub = uiState.subscribe(() => {
      refreshInteractionModeState();
      isHideLeftNavBar = refreshSidebarState();
    });
    $appLoadingState.isLocalLoaded = true;
    return () => {
      activeSession.clearIntervals();
      uiStateSub();
    };
  });
  function refreshSidebarState() {
    return uiState.getState(UIState.isHideLeftNavBar);
  }
  async function initializeData() {
    if (isLiteMode) return;
    if ($activeSession?.isSessionRunning) {
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

<UserBaseLayer>
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
  {#if $activeSession?.isSessionRunning}
    <SessionTitle />
  {/if}
  <Notifications />
  <BackgroundSoundPlayer />
</UserBaseLayer>
<svelte:document on:visibilitychange={handleVisibilityChange} />
