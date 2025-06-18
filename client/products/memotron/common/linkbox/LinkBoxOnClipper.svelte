<script lang="ts">
  import { toolbarState } from "$lib/client/extensions/clipper/contentScripts/store";
  import { Placement } from "$lib/client/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import LinkSearch from "./LinkSearch.svelte";
  const dispatch = createEventDispatcher();
  let searchQuery: string;
  let searchRef: LinkSearch;

  export function focus() {
    searchRef?.focus();
  }
</script>

<LinkSearch
  ctx="clipper"
  bind:searchQuery
  bind:this={searchRef}
  resultsPlacement={$toolbarState.position === Placement.Bottom
    ? Placement.TopCenter
    : Placement.BottomCenter}
  on:select={(e) => {
    if (e.detail?.item?.id) dispatch("link", e.detail?.item?.id);
    searchQuery = "";
  }}
  on:focus
/>
