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
  import FocusTopNavWidget from "../../pointron/focus/player/FocusTopNavWidget.svelte";

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
    //TODO
  }
</script>

<UserBaseLayer on:ready={onReady}>
  <div slot="topnav" class="flex gap-2 items-center">
    <FocusTopNavWidget />
    <Button
      icon="mynaui:plus-hexagon"
      tooltip="Capture"
      style={ButtonStyle.PLAIN}
      shortcut={resourceAction(Resource.node, ResourceActionType.CREATE)}
      parentBgIndex={2}
      on:click={() =>
        appStore.runAction(
          resourceAction(Resource.node, ResourceActionType.CREATE)
        )}
    />
  </div>
  <slot />
</UserBaseLayer>
<svelte:window on:focus={onAppear} />
