<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Library from "$lib/client/components/library/Library.svelte";

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
</script>

<Library resources={resolveLibraryItems()} />
