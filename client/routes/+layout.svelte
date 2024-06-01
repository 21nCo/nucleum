<script lang="ts">
  import "../app.css";
  import BaseLayer from "$lib/client/layout/layers/BaseLayer.svelte";
  import { appLoadingState } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import view from "$lib/client/stores/view.store";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import LocalBaseLayer from "$local/layout/LocalBaseLayer.svelte";
  import LocalLeftNav from "$local/layout/LocalLeftNav.svelte";
  import AppSplitView from "$lib/client/layout/AppSplitView.svelte";
</script>

<div
  class="text-base text-fgs1 bg-bgs1 relative {$appearance.theme +
    ' ' +
    $appearance.colorScheme.tailwindSelector}"
>
  <BaseLayer>
    <LocalBaseLayer>
      {#if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded}
        <AppLoadingView />
      {:else}
        <LocalLeftNav />
        <div
          class="flex flex-col h-full {$view.isPortrait
            ? 'w-full'
            : 'flex-grow'}"
        >
          <AppSplitView>
            <slot name="main" slot="main">
              <slot />
            </slot>
          </AppSplitView>
        </div>
        <!-- <RightPanel /> -->
      {/if}
    </LocalBaseLayer>
  </BaseLayer>
</div>
