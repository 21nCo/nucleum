<script lang="ts">
  import SheetBaseLayer from "$lib/client/extensions/SheetBaseLayer.svelte";
  import { Extension } from "$lib/client/products/product.type";
</script>

<SheetBaseLayer extension={Extension.MEMOTRON_SHARE}>
  <slot />
</SheetBaseLayer>
