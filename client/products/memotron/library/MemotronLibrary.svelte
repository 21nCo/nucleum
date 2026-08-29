<svelte:options runes={true} />

<script lang="ts">
  import { Resource } from "@21n/data/datafn/resource.enum";
  import Library from "@21n/components/library/Library.svelte";

  const libraryResources = [
    Resource.node,
    Resource.collection,
    Resource.relation
  ];
</script>

<Library resources={libraryResources} />
