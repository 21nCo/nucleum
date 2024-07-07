<script lang="ts">
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { searchForLinking } from "../../memotron.store";
  import LinkSuggestionItem from "./LinkSuggestionItem.svelte";
  let link: string;
  function onsearch(searchQuery: string) {
    return searchForLinking(searchQuery);
  }
</script>

<TextSearchInput
  bind:value={link}
  icon="clock"
  searchResultComponent={LinkSuggestionItem}
  popoverOptions={{
    offsetInPx: 6,
    isUseAbsolutePositioning: true
  }}
  on:select={(e) => {
    console.log("select", e.detail);

    link = "";
  }}
  searchCallback={onsearch}
  placeholder="Start typing to link to a node or add to a curation"
/>
