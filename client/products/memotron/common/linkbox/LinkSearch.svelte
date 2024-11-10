<script lang="ts">
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import LinkSearchResultItem from "./LinkSearchResultItem.svelte";
  import type { IPopoverOptions } from "$lib/client/types/popover.type";
  import { Placement } from "$lib/client/types/direction.enum";
  import { type InputLabel, InputStyle } from "$lib/client/types/input.type";
  import { SearchStore } from "../../memotron.store";
  import { onMount } from "svelte";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { isExtensionEnvironment } from "$lib/client/utils/browser.utils";
  export let context:
    | "capture"
    | "nodelinkspane"
    | "clipper"
    | "nodepageCollectionsLane" = "capture";
  export let resultsPlacement: Placement = Placement.BottomCenter;
  export let searchQuery: string;
  let popoverOptions: IPopoverOptions;
  let inputStyle: InputStyle = InputStyle.PLAIN;
  let placeholder: string =
    "Start typing to link to a node or add to a curation";
  let icon: string = "";
  let label: InputLabel | undefined = undefined;
  let searchInputRef: TextSearchInput;
  resolveOptions(context);

  export function focus() {
    searchInputRef?.focus();
    searchInputRef?.showDefaultResults();
  }

  onMount(() => {
    if (context === "nodepageCollectionsLane") {
      searchInputRef?.focus();
    }
  });

  function resolveOptions(
    context: "capture" | "nodelinkspane" | "clipper" | "nodepageCollectionsLane"
  ) {
    switch (context) {
      case "capture":
        popoverOptions = {
          offsetInPx: 12,
          placement: Placement.TopCenter
        };
        placeholder = "Start typing to link to a node or add to a collection";
        inputStyle = InputStyle.PLAIN;
        break;
      case "nodelinkspane":
        popoverOptions = {
          offsetInPx: 12,
          placement: Placement.BottomCenter
        };
        placeholder = "Start searching to add a direct link";
        icon = "arrow-right-left";
        inputStyle = InputStyle.BORDERED;
        break;
      case "nodepageCollectionsLane":
        popoverOptions = {
          offsetInPx: 4,
          placement: Placement.TopCenter
        };
        placeholder = "Start searching to add to a collection";
        // icon = "arrow-right-left";
        inputStyle = InputStyle.BORDERED;
        break;
      case "clipper":
        popoverOptions = {
          offsetInPx: 6,
          isUseAbsolutePositioning: true,
          placement: resultsPlacement
        };
        placeholder = "Link to a node or add to a collection";
        icon = "arrow-up-right";
        inputStyle = InputStyle.BORDERED;
        break;
    }
  }

  function onsearch(searchQuery: string) {
    const resource =
      context === "nodepageCollectionsLane"
        ? Resource.collection
        : context === "nodelinkspane"
          ? Resource.node
          : undefined;
    if (isExtensionEnvironment()) {
      return new SearchStore().searchForLinkingOnExtension(
        searchQuery,
        resource
      );
    }
    return new SearchStore().searchForLinking(searchQuery, { resource });
  }
</script>

<TextSearchInput
  bind:this={searchInputRef}
  bind:value={searchQuery}
  isInline={context === "nodepageCollectionsLane"}
  style={inputStyle}
  {icon}
  {label}
  searchResultComponent={LinkSearchResultItem}
  searchResultComponentProps={{
    isHideResourceType:
      context === "nodepageCollectionsLane" || context === "nodelinkspane"
  }}
  {popoverOptions}
  on:select
  on:hide
  searchCallback={onsearch}
  {placeholder}
/>
