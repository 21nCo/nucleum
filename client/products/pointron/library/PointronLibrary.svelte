<svelte:options runes={true} />

<script lang="ts">
  import Library from "@21n/components/library/Library.svelte";
  import { Product } from "@21n/products/product.type";
  import { resolveProductConfig } from "@21n/products/product.config";

  const libraryResources = resolveProductConfig(Product.POINTRON).resources
    .browse;
</script>

<Library resources={libraryResources} />
