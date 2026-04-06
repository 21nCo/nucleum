<script lang="ts">
  import { Orientation } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import type { IListItem } from "@21n/landing/shared/landing.type";
  import ListItem from "@21n/landing/shared/list/ListItem.svelte";
  let {
    items,
    orientation = Orientation.Vertical,
  }: {
    items: IListItem[];
    orientation?: Orientation;
  } = $props();

</script>

<div class="w-full flex items-center">
  <div
    class={cn("flex cw:flex-col", {
      "flex-col gap-2": orientation === Orientation.Vertical,
      "gap-8": orientation === Orientation.Horizontal
    })}
  >
    {#each items as item}
      <ListItem {item} />
    {/each}
  </div>
</div>
