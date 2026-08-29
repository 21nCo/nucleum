<svelte:options runes={true} />

<script lang="ts">
  import { Resource } from "@21n/data/datafn/resource.enum";
  import Library from "@21n/components/library/Library.svelte";
  import { Product } from "@21n/products/product.type";
  import { resolveProductResources } from "@21n/data/datafn/resource.utils";

  const isDev = import.meta.env.DEV;
  function resolveLibraryItems() {
    const items = resolveProductResources(Product.NUCLEUM, "library") ?? [
      Resource.collection
    ];
    if (isDev) {
      items.push(Resource.space);
    }
    return [...new Set(items)];
  }

  const libraryResources = resolveLibraryItems();
</script>

<Library resources={libraryResources} />
