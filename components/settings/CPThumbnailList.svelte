<script lang="ts">
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { ColorStrength } from "$lib/tidy/types/theme.type";
  import { resolveNavigationAction } from "$lib/tidy/utils/utils";
  import CpThumbnail from "./CPThumbnail.svelte";
  export let items: string[] = [];
  export let sectionName: string;
  export let orientation: Orientation = Orientation.Horizontal;
</script>

<div class="flex flex-col gap-2">
  {#if sectionName}
    <div class="pl-4">
      <Text style={TextStyle.SECTION_HEADING} content={sectionName} />
    </div>
  {/if}
  <div
    class={orientation === Orientation.Horizontal
      ? "flex flex-col "
      : "flex flex-wrap gap-2 pl-4"}
  >
    {#if items}
      {#each items as item}
        <CpThumbnail
          {orientation}
          action={item}
          on:click={() => {
            resolveNavigationAction(item);
          }}
        />
        {#if orientation === Orientation.Horizontal}
          <Divider colorStrength={ColorStrength.Subtle} />
        {/if}
      {/each}
    {/if}
  </div>
</div>
