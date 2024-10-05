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
  import MemotronLeftNav from "./MemotronLeftNav.svelte";
  import view from "$lib/client/stores/view.store";
  import AppSplitView from "$lib/client/layout/AppSplitView.svelte";
  import MemotronNotifications from "./MemotronNotifications.svelte";
  import Tabs from "$lib/client/layout/tabs/Tabs.svelte";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
  import { MemotronAction } from "../memotronAction.enum";
  import modalEvent from "$lib/client/components/modal/modal.store";
  import { captureStore } from "../capture/capture.store";
  import { CaptureType } from "../capture/capture.type";
  import { ResourceAccessMode } from "$lib/client/components/flux/resourceStores/resource.type";
  let isLiteMode = $context.isEmbed && $context.isSheet;

  onMount(async () => {
    $appLoadingState.isLocalLoaded = true;
    postMessageToParent(EmbedMessage.MOUNT);
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
      $captureStore.captureType = CaptureType.UPLOAD;
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
</script>

<UserBaseLayer>
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
  <MemotronNotifications />
</UserBaseLayer>
<svelte:document
  on:visibilitychange={handleVisibilityChange}
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
/>
<svelte:window on:paste={handlePaste} />
