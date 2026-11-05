<script lang="ts">
  import {
    SpaceNavItemType,
    type ISpaceLeafNavItem
  } from "@nucleum/features/spaces/space.type";
  import type { ISpaceWallContext } from "@nucleum/features/spaces/wall/space-wall.type";
  import SpaceWallCard from "@nucleum/features/spaces/wall/SpaceWallCard.svelte";
  import SpaceWallPageLinkCard from "@nucleum/features/spaces/wall/SpaceWallPageLinkCard.svelte";

  let {
    items,
    wall
  }: {
    items: ISpaceLeafNavItem[];
    wall: ISpaceWallContext;
  } = $props();
</script>

<ul
  class="grid w-full items-start gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))]"
  data-testid="space-wall-grid"
>
  {#each items as item (item.id)}
    {#if item.type === SpaceNavItemType.PAGE}
      <SpaceWallPageLinkCard {item} {wall} />
    {:else}
      <SpaceWallCard {item} {wall} />
    {/if}
  {/each}
</ul>
