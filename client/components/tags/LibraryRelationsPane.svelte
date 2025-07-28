<script lang="ts">
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import FormLabelTooltip from "$lib/client/elements/text/formLabel/FormLabelTooltip.svelte";
  import Text from "$lib/client/elements/text/Text.svelte";
  import LinkTagsControlPanel from "$lib/client/products/memotron/linking/LinkTagsControlPanel.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { TextStyle } from "$lib/client/types/text.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let isLibraryNavContext: boolean = false;
  let selectedSubType: Resource = Resource.linkTag;
</script>

<div class="flex flex-col gap-5 w-full h-full px-4 py-2">
  <button class="flex items-center justify-between gap-2">
    <button
      class={cn("flex items-center gap-2 rounded-md", {
        "notouch:hover:bg-bgs2 active:bg-bgs2": isLibraryNavContext
      })}
      on:click={() => {
        dispatch("back");
      }}
    >
      {#if isLibraryNavContext}
        <Icon icon="chevron-left" class="text-fgs3" />
      {/if}
      <Text content="Relations" style={TextStyle.PAGE_HEADING_SUBTLE} />
    </button>
    <FormLabelTooltip
      icon="question"
      info={{
        body: "Use relations to maintain relationship information between nodes.",
        size: Size.lg
      }}
    />
  </button>
  <div class="flex flex-col gap-3 flex-grow">
    {#if selectedSubType === Resource.linkTag || selectedSubType === Resource.relation}
      <LinkTagsControlPanel />
    {:else}
      <ComingSoonView />
    {/if}
  </div>
</div>
