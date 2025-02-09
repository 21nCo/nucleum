<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import LinkTagsControlPanel from "$lib/client/products/memotron/linking/LinkTagsControlPanel.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let isLibraryNavContext: boolean = false;
  let selectedSubType: Resource = Resource.linkTag;
</script>

<div class="flex flex-col gap-5 w-full h-full px-4 py-2">
  <button
    class="flex items-center gap-2 hover:bg-bgs2 rounded-md"
    on:click={() => {
      dispatch("back");
    }}
  >
    {#if isLibraryNavContext}
      <Icon icon="ph:caret-left-light" class="text-fgs3" />
    {/if}
    <Text content="Relations" style={TextStyle.PAGE_HEADING_SUBTLE} />
  </button>
  <div class="flex flex-col gap-3">
    {#if selectedSubType === Resource.linkTag}
      <LinkTagsControlPanel />
    {:else}
      <ComingSoonView />
    {/if}
  </div>
</div>
