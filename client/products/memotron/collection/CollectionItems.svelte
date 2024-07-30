<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import type { ICollection } from "$lib/client/products/memotron/collection/collection.type";
  import CollectionThumbnail from "./thumbnail/CollectionThumbnail.svelte";
  export let items: ICollection[] = [];
  export let arrangement: Arrangement = Arrangement.LIST;
</script>

<div class="flex flex-col gap-2 w-full">
  {#each items as item}
    <CollectionThumbnail {item} {arrangement} />
  {/each}
</div>
