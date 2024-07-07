<script lang="ts">
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import { searchForLinking } from "../../memotron.store";
  import LinkSuggestionItem from "./LinkSuggestionItem.svelte";
  export let toolbarPosition: Position.Right | Position.Left | Position.Bottom =
    Position.Right;
  let link: string;
  function onsearch(searchQuery: string) {
    return searchForLinking(searchQuery);
  }
</script>

<TextSearchInput
  bind:value={link}
  icon="arrow-up-right"
  searchResultComponent={LinkSuggestionItem}
  popoverOptions={{
    offsetInPx: 6,
    isUseAbsolutePositioning: true,
    placement:
      toolbarPosition === Position.Bottom
        ? Position.TopCenter
        : Position.BottomCenter
  }}
  on:select={(e) => {
    console.log("select", e.detail);

    link = "";
  }}
  searchCallback={onsearch}
  placeholder="Link to a node or add to a collection"
/>
