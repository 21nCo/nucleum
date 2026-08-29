<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { activeSession } from "@21n/products/pointron/focus/session.store";
  import { appLoadingState, appStore } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import UserBaseLayer from "@21n/layout/layers/UserBaseLayer.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { resourceAction } from "@21n/data/datafn/resource.utils";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import { ResourceActionType } from "@21n/data/datafn/resource.type";
  import FocusTopNavWidget from "@21n/products/pointron/focus/player/FocusTopNavWidget.svelte";
  import PointronNotifications from "@21n/products/pointron/base/Notifications.svelte";
  import MemotronNotifications from "@21n/products/memotron/base/MemotronNotifications.svelte";
  import BackgroundSoundPlayer from "@21n/products/pointron/focus/backgroundMusic/BackgroundSoundPlayer.svelte";
  import SessionTitle from "@21n/products/pointron/base/SessionTitle.svelte";
  import MemoryBase from "@21n/products/memotron/base/MemoryBase.svelte";
  import TopNavLeftMenuItem from "@21n/layout/topNav/TopNavLeftMenuItem.svelte";
  import { Action } from "@21n/types/action.enum";
  let { children }: { children?: Snippet } = $props();
  let isLiteMode = $state($context.isEmbed && $context.isSheet);

  onMount(() => {
    initializeData();
    window.addEventListener("focus", onAppear);
    return () => {
      activeSession.clearIntervals();
      window.removeEventListener("focus", onAppear);
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
    // TODO
    $appLoadingState.isLocalLoaded = true;
  }
</script>

<UserBaseLayer {onReady}>
  {#snippet topnav()}
    <div class="flex items-center h-full">
      <TopNavLeftMenuItem
        action={resourceAction(Resource.node, ResourceActionType.CREATE)}
      />
      <FocusTopNavWidget />
      <!-- {#if isDebug}
        <TopNavLeftMenuItem action={Action.FEED} />
      {/if} -->
    </div>
  {/snippet}
  {@render children?.()}
  <PointronNotifications />
  <MemotronNotifications />
  <BackgroundSoundPlayer />
  <SessionTitle />
</UserBaseLayer>
<MemoryBase />
