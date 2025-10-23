<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Library from "@21n/components/library/Library.svelte";

  const isDev = import.meta.env.DEV;
  function resolveLibraryItems() {
    const items = [Resource.goal, Resource.task, Resource.collection];
    if (isDev) {
      items.push(Resource.event);
    }
    return items;
  }
</script>

<Library resources={resolveLibraryItems()} />
