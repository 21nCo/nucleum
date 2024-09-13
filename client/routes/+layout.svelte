<script lang="ts">
  import "../app.css";
  import appearance from "$lib/client/stores/appearance.store";
  import ProductBaseLayer from "$local/LocalBaseLayer.svelte";
  import MetadataLayer from "../layout/layers/MetadataLayer.svelte";
</script>

<div
  class="text-base text-fgs1 bg-bgs1 relative {$appearance.theme +
    ' ' +
    $appearance.colorScheme.tailwindSelector}"
>
  <ProductBaseLayer>
    <slot />
  </ProductBaseLayer>
</div>
<MetadataLayer />
