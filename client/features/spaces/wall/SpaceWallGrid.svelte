<script lang="ts">
  import type { ISpaceResourceNavItem } from "@nucleum/features/spaces/space.type";
  import type { ISpaceWallContext } from "@nucleum/features/spaces/wall/space-wall.type";
  import SpaceWallCard from "@nucleum/features/spaces/wall/SpaceWallCard.svelte";

  let {
    items,
    wall
  }: {
    items: ISpaceResourceNavItem[];
    wall: ISpaceWallContext;
  } = $props();
</script>

<ul
  class="grid w-full items-start gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]"
  data-testid="space-wall-grid"
>
  {#each items as item (item.id)}
    <SpaceWallCard {item} {wall} />
  {/each}
</ul>
