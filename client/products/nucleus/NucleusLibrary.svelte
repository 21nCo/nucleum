<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import Library from "$lib/client/components/library/Library.svelte";
</script>

<Library
  resources={[
    Resource.goal,
    Resource.node,
    Resource.collection,
    Resource.combination,
    Resource.relation
  ]}
/>
