<svelte:options runes={true} />

<script lang="ts">
  import { Resource } from "@21n/data/datafn/resource.enum";
  import Library from "@21n/components/library/Library.svelte";
  import { Product } from "@21n/products/product.type";
  import { resolveProductConfig } from "@21n/products/product.config";

  function resolveLibraryItems() {
    const items = resolveProductConfig(Product.NUCLEUM).resources?.browse ?? [
      Resource.collection
    ];
    return [...new Set(items)] as Resource[];
  }

  const libraryResources = resolveLibraryItems();
</script>

<Library resources={libraryResources} />
