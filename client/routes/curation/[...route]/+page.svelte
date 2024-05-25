<script>
  import { page } from "$app/stores";
  import CurationView from "$lib/client/components/memotron/curation/CurationView.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  $: id = $page.url.searchParams.get("main");
</script>

{#if id}
  <CurationView {id} />
{:else}
  <EmptyStatusView
    mainText="Nothing selected."
    subText="Please select a curation to view."
  />
{/if}
