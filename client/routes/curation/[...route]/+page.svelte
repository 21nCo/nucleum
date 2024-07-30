<script>
  import { page } from "$app/stores";
  import Curation from "$lib/client/products/memotron/curation/Curation.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { ResourceAccessMode } from "$lib/client/components/resourceStores/resource.type";
  $: id = $page.url.searchParams.get(ResourceAccessMode.INLINE);
</script>

{#if id}
  {#key id}
    <Curation {id} />
  {/key}
{:else}
  <EmptyStatusView
    mainText="Nothing selected."
    subText="Please select a curation to view."
  />
{/if}
