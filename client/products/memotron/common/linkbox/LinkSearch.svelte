<script lang="ts">
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import LinkSuggestionItem from "./LinkSuggestionItem.svelte";
  import { searchForLinking } from "../../memotron.store";
  import type { IPopoverOptions } from "$lib/client/types/popover.type";
  import { Orientation, Position } from "$lib/client/types/direction.enum";
  import { type InputLabel, InputStyle } from "$lib/client/types/input.type";
  export let context: "capture" | "nodepage" | "clipper" = "capture";
  export let resultsPlacement: Position = Position.BottomCenter;
  export let searchQuery: string;
  let popoverOptions: IPopoverOptions;
  let inputStyle: InputStyle = InputStyle.PLAIN;
  let placeholder: string =
    "Start typing to link to a node or add to a curation";
  let icon: string = "";
  let label: InputLabel | undefined = undefined;

  resolveOptions(context);

  function resolveOptions(context: "capture" | "nodepage" | "clipper") {
    switch (context) {
      case "capture":
        popoverOptions = {
          offsetInPx: 12,
          placement: Position.TopCenter
        };
        placeholder = "Start typing to link to a node or add to a collection";
        inputStyle = InputStyle.PLAIN;
        break;
      case "nodepage":
        popoverOptions = {
          offsetInPx: 12,
          placement: Position.BottomCenter
        };
        placeholder = "Start searching to add a direct link";
        icon = "arrow-right-left";
        inputStyle = InputStyle.BORDERED;
        // label = { label: "Add link", orientation: Orientation.Vertical };
        break;
      case "clipper":
        popoverOptions = {
          offsetInPx: 6,
          isUseAbsolutePositioning: true,
          placement: resultsPlacement
        };
        placeholder = "Link to a node or add to a collection";
        icon = "arrow-up-right";
        break;
    }
  }

  function onsearch(searchQuery: string) {
    return searchForLinking(searchQuery);
  }
</script>

<TextSearchInput
  bind:value={searchQuery}
  style={inputStyle}
  {icon}
  {label}
  searchResultComponent={LinkSuggestionItem}
  {popoverOptions}
  on:select
  searchCallback={onsearch}
  {placeholder}
/>
