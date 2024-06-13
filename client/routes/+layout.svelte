<script lang="ts">
  import "../app.css";
  import BaseLayer from "$lib/client/layout/layers/BaseLayer.svelte";
  import { appLoadingState } from "$lib/client/stores/app.store";
  import appearance from "$lib/client/stores/appearance.store";
  import AppLoadingView from "$lib/client/layout/paint/AppLoadingView.svelte";
  import LocalBaseLayer from "$local/layout/LocalBaseLayer.svelte";
</script>

<div
  class="text-base text-fgs1 bg-bgs1 relative {$appearance.theme +
    ' ' +
    $appearance.colorScheme.tailwindSelector}"
>
  <BaseLayer>
    {#if !$appLoadingState.isBaseLoaded || !$appLoadingState.isLocalLoaded}
      <AppLoadingView />
    {/if}
    <LocalBaseLayer>
      <slot />
    </LocalBaseLayer>
  </BaseLayer>
</div>
