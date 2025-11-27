<script lang="ts">
  import { onMount } from "svelte";
  import { appLoadingState, appStore } from "@21n/stores/app.store";
  import { scheduledNotifications } from "@21n/stores/notification.store";
  import { postDataToParent } from "@21n/utils/embed.utils";
  import context from "@21n/stores/context.store";
  import view from "@21n/stores/view.store";
  import { InteractionMode } from "@21n/components/settings/interactionMode/interactionMode.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import CommandModePage from "@21n/components/commandBar/CommandModePage.svelte";
  import { Embed } from "@21n/types/context.type";
  import { UIState } from "@21n/stores/uiState/uiState.type";
  import LeftNav from "@21n/layout/leftPanel/LeftNav.svelte";
  import AppSplitView from "@21n/layout/AppSplitView.svelte";
  import TopNav from "@21n/layout/topNav/TopNav.svelte";
  import { EmbedDataMessage } from "@21n/types/embedMessage.enum";
  import RightNav from "../rightPanel/RightNav.svelte";

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
        postDataToParent(
          EmbedDataMessage.NOTIFICATIONS,
          $scheduledNotifications
        );
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
  {#if $appStore.interactionMode === InteractionMode.AGENT && $context.embed !== Embed.HANDSET}
    <CommandModePage>
      <slot />
    </CommandModePage>
  {:else}
    <div class="flex flex-col w-full h-full">
      <div class="flex w-full flex-grow">
        {#if $context.embed === Embed.HANDSET}
          <LeftNav variant="fixed" />
        {/if}
        <div class="flex flex-col h-full w-full">
          {#if !$view.isPortrait}
            <TopNav>
              <slot name="topnav" slot="topnav" />
            </TopNav>
          {/if}
          <div class="flex w-full flex-grow">
            {#if $context.embed !== Embed.HANDSET && !isHideLeftNavBar}
              <LeftNav variant="fixed" />
            {/if}
            <div class="min-w-0 flex-grow">
              <AppSplitView>
                <slot name="main" slot="main">
                  <slot />
                </slot>
              </AppSplitView>
            </div>
            <!-- <RightNav /> -->
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
<svelte:document on:visibilitychange={handleVisibilityChange} />
