<script lang="ts">
  import { captureStore } from "$lib/tidy/components/memotron/capture/capture.store";
  import DirectLinks from "../common/foreLinks/DirectLinks.svelte";
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import { TextInputStyle } from "$lib/tidy/types/textinput.enum";
  import { isValidArrayWithData } from "$lib/tidy/utils/obj.utils";
  import Icon from "$lib/tidy/elements/Icon.svelte";
  import { Size } from "$lib/tidy/types/size.enum";
  import TextSearchInput from "$lib/tidy/elements/input/TextSearchInput.svelte";
  import { cn } from "$lib/tidy/utils/ui.utils";
  let link: string;
  function onsearch(searchQuery: string) {
    return captureStore.searchForLinking(searchQuery);
  }
</script>

<section class="flex flex-col gap-4 w-full">
  <div class="h-6">
    {#if isValidArrayWithData($captureStore.links)}
      <DirectLinks
        links={$captureStore.links}
        on:remove={(e) => {
          console.log("remove", e);
          captureStore.removeDLink(e.detail.id);
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
      style={TextInputStyle.PLAIN}
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
