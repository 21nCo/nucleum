<script lang="ts">
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { toolbarState } from "$lib/client/extensions/clipper/contentScripts/store";
  import { Position } from "$lib/client/types/direction.enum";
  import { createEventDispatcher } from "svelte";
  import { searchForLinking } from "../../memotron.store";
  import LinkSuggestionItem from "./LinkSuggestionItem.svelte";
  import LinkSearch from "./LinkSearch.svelte";
  const dispatch = createEventDispatcher();
  let link: string;
  function onsearch(searchQuery: string) {
    return searchForLinking(searchQuery);
  }
</script>

<!-- <TextSearchInput
  bind:value={link}
  icon="arrow-up-right"
  searchResultComponent={LinkSuggestionItem}
  popoverOptions={{
    offsetInPx: 6,
    isUseAbsolutePositioning: true,
    placement:
      $toolbarState.position === Position.Bottom
        ? Position.TopCenter
        : Position.BottomCenter
  }}
  on:select={(e) => {
    if (e.detail?.item?.id) dispatch("link", e.detail?.item?.id);
    link = "";
  }}
  searchCallback={onsearch}
  placeholder="Link to a node or add to a collection"
/> -->

<LinkSearch
  context="clipper"
  resultsPlacement={$toolbarState.position === Position.Bottom
    ? Position.TopCenter
    : Position.BottomCenter}
  on:select={(e) => {
    if (e.detail?.item?.id) dispatch("link", e.detail?.item?.id);
    link = "";
  }}
/>
