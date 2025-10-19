<script>
  import { page } from "$app/stores";
  import { ResourceAccessMode } from "@21n/components/flux/resourceStores/resource.type";
  import ResourceResolver from "@21n/layout/paint/ResourceResolver.svelte";

  $: tab = $page.url.searchParams.get(ResourceAccessMode.TAB);
</script>

{#if tab}
  {#key tab}
    <ResourceResolver id={tab} accessMode={ResourceAccessMode.TAB} />
  {/key}
{/if}
