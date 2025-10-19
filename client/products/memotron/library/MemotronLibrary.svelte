<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import Library from "@21n/components/library/Library.svelte";
</script>

<Library resources={[Resource.node, Resource.collection, Resource.relation]} />
