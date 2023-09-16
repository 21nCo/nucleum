<script lang="ts">
  import Text from "$lib/tidy/elements/text/Text.svelte";
  import { windowObject } from "$lib/tidy/stores/app.store";
  import { Orientation } from "$lib/tidy/types/direction.enum";
  import { TextType } from "$lib/tidy/types/text.enum";
  import CpThumbnail from "./CPThumbnail.svelte";
  export let items: string[] = [];
  export let section: string;
  export let orientation: Orientation = Orientation.Vertical;
</script>

<div class="flex flex-col gap-2">
  <div class="pl-4">
    <Text type={TextType.CP_SECTION}>{section}</Text>
  </div>
  <div
    class={orientation === Orientation.Horizontal
      ? "flex flex-col -ml-4"
      : "flex flex-wrap gap-2 pl-4"}
  >
    {#each items as item}
      <CpThumbnail {orientation} path={item} />
      {#if orientation === Orientation.Horizontal}
        <div class="border-b border-bgs2 w-full" />
      {/if}
    {/each}
  </div>
</div>
