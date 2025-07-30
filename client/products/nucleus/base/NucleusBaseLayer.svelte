<script lang="ts">
  import { onMount } from "svelte";
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import { appLoadingState, appStore } from "$lib/client/stores/app.store";
  import context from "$lib/client/stores/context.store";
  import UserBaseLayer from "$lib/client/layout/layers/UserBaseLayer.svelte";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { resourceAction } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { ResourceActionType } from "$lib/client/components/flux/resourceStores/resource.type";
  import FocusTopNavWidget from "$lib/client/products/pointron/focus/player/FocusTopNavWidget.svelte";
  import PointronNotifications from "$lib/client/products/pointron/base/Notifications.svelte";
  import MemotronNotifications from "$lib/client/products/memotron/base/MemotronNotifications.svelte";
  import BackgroundSoundPlayer from "$lib/client/products/pointron/focus/backgroundMusic/BackgroundSoundPlayer.svelte";
  import SessionTitle from "../../pointron/base/SessionTitle.svelte";
  import MemoryBase from "../../memotron/base/MemoryBase.svelte";
  import { FallbackTracker } from "$lib/client/utils/fallbackTracker.utils";
  import { defaultsMigrationFocus } from "../../pointron/migrations";
  import { defaultsMigrationTidy } from "$lib/client/components/migrations";
  import { defaultsMigrationForNodes } from "../../memotron/base/migrations";
  import TopNavLeftMenuItem from "$lib/client/layout/topNav/TopNavLeftMenuItem.svelte";

  let isLiteMode = $context.isEmbed && $context.isSheet;
  const isDebug = import.meta.env?.DEV;

  onMount(() => {
    initializeData();
    return () => {
      activeSession.clearIntervals();
    };
  });

  async function initializeData() {
    if (isLiteMode) return;
    //TODO
  }

  function onAppear() {
    //TODO
  }

  async function onReady() {
    if (isLiteMode) return;
    if (!isDebug) await runFallbacks();
    // TODO
    $appLoadingState.isLocalLoaded = true;
  }

  async function runFallbacks() {
    await FallbackTracker.runIfNotCompleted(
      "defaultsMigrationFocus",
      defaultsMigrationFocus
    );
    await FallbackTracker.runIfNotCompleted(
      "defaultsMigrationTidy",
      defaultsMigrationTidy
    );
    await FallbackTracker.runIfNotCompleted(
      "defaultsMigrationForNodes",
      defaultsMigrationForNodes
    );
  }
</script>

<UserBaseLayer on:ready={onReady}>
  <div slot="topnav" class="flex gap-1 items-center h-full">
    <FocusTopNavWidget />
    <TopNavLeftMenuItem
      icon="mynaui:plus-hexagon"
      tooltip="Capture"
      shortcut={resourceAction(Resource.node, ResourceActionType.CREATE)}
      on:click={() =>
        appStore.runAction(
          resourceAction(Resource.node, ResourceActionType.CREATE)
        )}
    />
  </div>
  <slot />
  <PointronNotifications />
  <MemotronNotifications />
  <BackgroundSoundPlayer />
  <SessionTitle />
</UserBaseLayer>
<svelte:window on:focus={onAppear} />
<MemoryBase />
