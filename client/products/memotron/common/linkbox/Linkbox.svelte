<script lang="ts">
  import { captureStore } from "$lib/client/products/memotron/capture/capture.store";
  import DirectLinks from "../foreLinks/DirectLinks.svelte";
  import Divider from "$lib/client/elements/Divider.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { InputStyle } from "$lib/client/types/input.type";
  import LinkSuggestionItem from "./LinkSuggestionItem.svelte";
  import { searchForLinking } from "../../memotron.store";
  import LinkItems from "./LinkItems.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  let link: string;
  function onsearch(searchQuery: string) {
    return searchForLinking(searchQuery);
  }
</script>

<section class="flex flex-col gap-2 w-full">
  <div class="h-8">
    {#if isValidArrayWithData($captureStore.links)}
      <LinkItems
        links={$captureStore.links?.map((x) => x.to)}
        on:unlink={(e) => {
          console.log("unlink", e);
          captureStore.removeDLink(e.detail);
        }}
      />
    {/if}
  </div>
  <Divider />
  <div class={cn("flex", "gap-2")}>
    <div class="flex gap-1">
      <Icon icon="arrow-up-right" size={Size.sm} />
    </div>
    <TextSearchInput
      bind:value={link}
      style={InputStyle.PLAIN}
      searchResultComponent={LinkSuggestionItem}
      popoverOptions={{
        offsetInPx: 12,
        placement: Position.TopCenter
      }}
      on:select={(e) => {
        console.log("select", e.detail);
        captureStore.directLink(e.detail.item);
        link = "";
      }}
      searchCallback={onsearch}
      placeholder="Start typing to link to a node or add to a curation"
    />
  </div>
</section>
