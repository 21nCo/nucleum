<script lang="ts">
  import { onMount } from "svelte";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import { scheduledNotifications } from "$lib/client/stores/notification.store";
  import { postToParent } from "$lib/client/utils/embed.utils";
  import context from "$lib/client/stores/context.store";
  import view from "$lib/client/stores/view.store";
  import { InteractionMode } from "$lib/client/components/settings/interactionMode/interactionMode.type";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import CommandModePage from "$lib/client/components/commandBar/CommandModePage.svelte";
  import { Embed } from "$lib/client/types/context.type";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  import LeftNav from "$lib/client/layout/leftPanel/LeftNav.svelte";
  import AppSplitView from "$lib/client/layout/AppSplitView.svelte";
  import TopNav from "$lib/client/layout/topNav/TopNav.svelte";

  let isHideLeftNavBar: boolean = refreshSidebarState();
  onMount(() => {
    const uiStateSub = uiState.subscribe(() => {
      isHideLeftNavBar = refreshSidebarState();
    });
    $appLoadingState.isLocalLoaded = true;
    return () => {
      uiStateSub();
    };
  });

  function refreshSidebarState() {
    return uiState.getState(UIState.isHideLeftNavBar);
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
  {#if $appStore.interactionMode === InteractionMode.COMMAND_ONLY && $context.embed !== Embed.HANDSET}
    <CommandModePage>
      <slot />
    </CommandModePage>
  {:else}
    <div class="flex flex-col w-full h-full">
      <div class="flex w-full flex-grow">
        {#if !isHideLeftNavBar || $context.embed === Embed.HANDSET}
          <LeftNav variant="fixed" />
        {/if}
        <div
          class="flex flex-col h-full {$view.isPortrait
            ? 'w-full'
            : 'flex-grow'}"
        >
          {#if !$view.isPortrait}
            <TopNav>
              <slot name="topnav" slot="topnav" />
            </TopNav>
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
<svelte:document on:visibilitychange={handleVisibilityChange} />
