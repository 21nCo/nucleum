<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Library from "$lib/client/components/library/Library.svelte";

  function resolveLibraryItems() {
    return [
      Resource.goal,
      Resource.task,
      Resource.collection
      // Resource.habit,
      // Resource.event,
      // Resource.combination
    ];
  }
</script>

<Library resources={resolveLibraryItems()} />
