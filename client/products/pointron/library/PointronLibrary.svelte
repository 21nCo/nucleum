<svelte:options runes={true} />

<script lang="ts">
  import Library from "@nucleum/surfaces/library/Library.svelte";
  import { Product } from "@nucleum/client/config/product.type";
  import { resolveProductConfig } from "@nucleum/products/product.config";

  let {
    subPath = undefined,
    isRouted = true
  }: { subPath?: string[]; isRouted?: boolean } = $props();

  const libraryResources = resolveProductConfig(Product.POINTRON).resources
    .browse;
</script>

<Library resources={libraryResources} {subPath} {isRouted} />
