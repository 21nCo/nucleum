<script lang="ts">
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { userPreferences } from "$lib/tidy/stores/app.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextType } from "$lib/tidy/types/text.enum";
  import { border } from "$lib/tidy/utils/utils";
  import CpThumbnail from "./CPThumbnail.svelte";
  export let items: string[] = [];
  export let section: string;
  export let orientation: Orientation = Orientation.Vertical;
</script>

<div class="flex flex-col gap-2">
  <div class="pl-4">
    <Text style={TextType.SECTION_HEADING}>{section}</Text>
  </div>
  <div
    class={orientation === Orientation.Horizontal
      ? "flex flex-col "
      : "flex flex-wrap gap-2 pl-4"}
  >
    {#each items as item}
      <CpThumbnail {orientation} path={item} />
      {#if orientation === Orientation.Horizontal}
        <div class="border-b w-full {border($userPreferences.theme)}" />
      {/if}
    {/each}
  </div>
</div>
