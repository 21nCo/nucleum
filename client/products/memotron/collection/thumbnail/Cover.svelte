<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import type { ICollectionThumb } from "../collection.type";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import CoverRenderer from "$lib/client/elements/coverPicker/CoverRenderer.svelte";
  export let item: ICollectionThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
</script>

<div class="relative grow w-full overflow-auto">
  {#if item.cover}
    <CoverRenderer
      cover={item.cover}
      class={cn("absolute inset-0 h-full w-full object-cover", {
        "rounded-t-md":
          arrangement === Arrangement.GRID ||
          arrangement === Arrangement.MASONRY,
        "rounded-md": arrangement === Arrangement.LIST
      })}
    />
  {:else}
    <div
      class={cn("flex w-full h-full justify-center items-center bg-bgs2/50", {
        "rounded-t-md":
          arrangement === Arrangement.GRID ||
          arrangement === Arrangement.MASONRY,
        "rounded-md": arrangement === Arrangement.LIST
      })}
    >
      {#if arrangement === Arrangement.LIST}
        <span class="text-h3 text-fgs4 font-medium">
          {item.label?.slice(0, 1) || "?"}
        </span>
      {/if}
    </div>
  {/if}
</div>
