<svelte:options runes={true} />

<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Library from "@21n/components/library/Library.svelte";

  const libraryResources = [
    Resource.node,
    Resource.collection,
    Resource.relation
  ];
</script>

<Library resources={libraryResources} />
