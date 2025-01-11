<script>
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import ResourceBrowser from "$lib/client/components/record/ResourceBrowser.svelte";
</script>

<ResourceBrowser resource={Resource.collection} />
