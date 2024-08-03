<script lang="ts">
  import "../app.css";
  import appearance from "$lib/client/stores/appearance.store";
  import LocalBaseLayer from "$local/layout/LocalBaseLayer.svelte";
</script>

<div
  class="text-base text-fgs1 bg-bgs1 relative {$appearance.theme +
    ' ' +
    $appearance.colorScheme.tailwindSelector}"
>
  <LocalBaseLayer>
    <slot />
  </LocalBaseLayer>
</div>
