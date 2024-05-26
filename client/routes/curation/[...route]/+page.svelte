<script>
  import { page } from "$app/stores";
  import Curation from "$lib/client/components/memotron/curation/Curation.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  $: id = $page.url.searchParams.get("main");
</script>

{#if id}
  <Curation {id} />
{:else}
  <EmptyStatusView
    mainText="Nothing selected."
    subText="Please select a curation to view."
  />
{/if}
