<script lang="ts">
  import SheetBaseLayer from "@21n/extensions/SheetBaseLayer.svelte";
  import { Extension } from "@21n/products/product.type";
</script>

<SheetBaseLayer extension={Extension.MEMOTRON_SHARE}>
  <slot />
</SheetBaseLayer>
