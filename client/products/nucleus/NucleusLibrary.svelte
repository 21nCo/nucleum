<svelte:options runes={true} />

<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Library from "@21n/components/library/Library.svelte";

  const isDev = import.meta.env.DEV;
  function resolveLibraryItems() {
    const items = [
      Resource.collection,
      Resource.goal,
      Resource.node,
      Resource.relation
    ];
    if (isDev) {
      items.push(...[Resource.event, Resource.combination]);
    }
    return items;
  }

  const libraryResources = resolveLibraryItems();
</script>

<Library resources={libraryResources} />
