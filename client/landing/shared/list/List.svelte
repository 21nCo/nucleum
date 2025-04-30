<script lang="ts">
  import { Orientation } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IListItem } from "../landing.type";
  import ListItem from "./ListItem.svelte";
  export let items: IListItem[];
  export let orientation: Orientation = Orientation.Vertical;
</script>

<div class="w-full flex items-center">
  <div
    class={cn("flex", {
      "flex-col gap-2": orientation === Orientation.Vertical,
      "gap-8": orientation === Orientation.Horizontal
    })}
  >
    {#each items as item}
      <ListItem {item} />
    {/each}
  </div>
</div>
