<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { appLoadingState } from "@nucleum/shared-state/app-context/app.store";
  import context from "@nucleum/client/runtime/context.store";
  import MemotronNotifications from "@nucleum/products/memotron/base/MemotronNotifications.svelte";
  import UserBaseLayer from "@nucleum/composition/layers/UserBaseLayer.svelte";
  import MemoryBase from "@nucleum/products/memotron/base/MemoryBase.svelte";
  import TopNavLeftMenuItem from "@nucleum/shell/topNav/TopNavLeftMenuItem.svelte";
  import { resourceAction } from "@nucleum/datafn/resource.utils";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { ResourceActionType } from "@nucleum/schema/legacy/resource-action.enum";
  let { children }: { children?: Snippet } = $props();
  let isLiteMode = $state($context.isEmbed && $context.isSheet);

  async function onUserBaseLayerReady() {
    if (isLiteMode) return;
    $appLoadingState.isLocalLoaded = true;
  }
</script>

<UserBaseLayer onReady={onUserBaseLayerReady}>
  {#snippet topnav()}
    <div class="flex items-center h-full">
      <TopNavLeftMenuItem
        action={resourceAction(Resource.node, ResourceActionType.CREATE)}
      />
    </div>
  {/snippet}
  {@render children?.()}
  <MemotronNotifications />
</UserBaseLayer>
<MemoryBase />
