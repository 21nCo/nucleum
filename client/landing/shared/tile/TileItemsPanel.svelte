<script lang="ts">
  import type { ITileItem } from "../Landing.types";
  import TileItem from "./TileItem.svelte";

  export let currentProducts: ITileItem[];
  export let upcomingProducts: ITileItem[];
</script>

<div class="flex flex-col gap-3 overflow-scroll">
  <p>Current Products</p>
  <div>
    {#each currentProducts as product}
      <TileItem item={product} />
    {/each}
  </div>
  <p>Upcoming Products</p>
  <div>
    {#each upcomingProducts as product}
      <TileItem item={product} />
    {/each}
  </div>
</div>
