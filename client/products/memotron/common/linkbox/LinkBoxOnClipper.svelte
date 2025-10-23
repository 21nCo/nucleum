<script lang="ts">
  import { toolbarState } from "@21n/extensions/clipper/contentScripts/store";
  import { Placement } from "@21n/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import LinkSearch from "@21n/products/memotron/common/linkbox/LinkSearch.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  const dispatch = createEventDispatcher();
  let searchQuery: string;
  let searchRef: LinkSearch;

  export function focus() {
    searchRef?.focus();
  }
</script>

<LinkSearch
  accessPoint={ResourceAccessPoint.CLIPPER}
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
