<script lang="ts">
  import type { Snippet } from "svelte";
  import SheetBaseLayer from "@21n/extensions/SheetBaseLayer.svelte";
  import { Extension } from "@21n/products/product.type";
  let { children }: { children?: Snippet } = $props();
</script>

<SheetBaseLayer extension={Extension.MEMOTRON_SHARE}>
  {@render children?.()}
</SheetBaseLayer>
