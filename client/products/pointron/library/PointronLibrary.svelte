<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Library from "$lib/client/components/library/Library.svelte";
  import context from "$lib/client/stores/context.store";
  import { OperatingSystem } from "$lib/client/types/context.type";

  function resolveLibraryItems() {
    if (
      $context.isEmbed &&
      ($context.os === OperatingSystem.IOS ||
        $context.os === OperatingSystem.MACOS)
    ) {
      return [Resource.node, Resource.collection, Resource.todo];
    }
    return [
      Resource.task,
      Resource.habit,
      Resource.todo,
      Resource.collection,
      Resource.combination
    ];
  }
</script>

<Library resources={resolveLibraryItems()} />
