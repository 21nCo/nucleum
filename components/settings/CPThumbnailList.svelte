<script lang="ts">
  import Divider from "$lib/tidy/elements/Divider.svelte";
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextStyle } from "$lib/tidy/types/text.enum";
  import { ColorStrength } from "$lib/tidy/types/appearance.type";
  import CpThumbnail from "./CPThumbnail.svelte";
  import { appStore } from "$lib/tidy/stores/app.store";
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
          setActiveByPath={true}
          on:click={() => {
            appStore.resolveNavigationAction(item);
          }}
        />
        {#if orientation === Orientation.Horizontal}
          <Divider colorStrength={ColorStrength.Subtle} />
        {/if}
      {/each}
    {/if}
  </div>
</div>
