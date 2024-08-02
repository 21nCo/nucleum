<script lang="ts">
  import CountBadge from "./CountBadge.svelte";
  import { CollectionType } from "$lib/client/products/memotron/collection/collection.type";
  import type { ICollection } from "../collection.type";
  export let item: ICollection;
</script>

{#if item.properties && item.properties?.length > 0}
  <div class="flex gap-2">
    <!-- <CountBadge count={10} label="nodes" /> -->
    {#if item.type === CollectionType.TYPED && item.properties && item.properties?.length > 0}
      <CountBadge count={item.properties?.length} label="properties" />
    {/if}
  </div>
{/if}
