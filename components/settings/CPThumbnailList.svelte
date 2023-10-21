<script lang="ts">
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextType } from "$lib/tidy/types/text.enum";
  import { ColorStrength } from "$lib/tidy/types/theme.type";
  import CpThumbnail from "./CPThumbnail.svelte";
  export let items: string[] = [];
  export let sectionName: string;
  export let orientation: Orientation = Orientation.Horizontal;
</script>

<div class="flex flex-col gap-2">
  {#if sectionName}
    <div class="pl-4">
      <Text style={TextType.SECTION_HEADING}>{sectionName.toUpperCase()}</Text>
    </div>
  {/if}
  <div
    class={orientation === Orientation.Horizontal
      ? "flex flex-col "
      : "flex flex-wrap gap-2 pl-4"}
  >
    {#each items as item}
      <CpThumbnail {orientation} action={item} />
      {#if orientation === Orientation.Horizontal}
        <Divider colorStrength={ColorStrength.Subtle} />
      {/if}
    {/each}
  </div>
</div>
