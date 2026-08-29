<svelte:options runes={true} />

<script lang="ts">
  import type { Snippet } from "svelte";
  import { appLoadingState } from "@21n/stores/app.store";
  import context from "@21n/stores/context.store";
  import MemotronNotifications from "@21n/products/memotron/base/MemotronNotifications.svelte";
  import UserBaseLayer from "@21n/layout/layers/UserBaseLayer.svelte";
  import MemoryBase from "@21n/products/memotron/base/MemoryBase.svelte";
  import TopNavLeftMenuItem from "@21n/layout/topNav/TopNavLeftMenuItem.svelte";
  import { resourceAction } from "@21n/data/datafn/resource.utils";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import { ResourceActionType } from "@21n/data/datafn/resource.type";
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
