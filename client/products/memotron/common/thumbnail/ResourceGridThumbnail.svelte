<script lang="ts">
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import ResourceThumbnailTitle from "./ResourceThumbnailTitle.svelte";
  export let item: any;
  export let size: Size.sm | Size.md = Size.md;
</script>

<button
  class={cn(
    "relative flex flex-col w-full border border-brs3 rounded-md hover:border-aps2",
    {
      "h-44": size === Size.sm,
      "h-[15.2rem] w--[17.5rem]": size === Size.md
    }
  )}
  on:click
>
  <slot />
  <div
    class="flex flex-col gap-2 w-full bg-bgs2 rounded-b-md border-t border-brs3 items-start p-3"
  >
    <ResourceThumbnailTitle {item} />
    <slot name="bottom" />
  </div>
</button>
