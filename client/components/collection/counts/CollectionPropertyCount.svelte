<script lang="ts">
  import CountBadge from "./CountBadge.svelte";
  import { CollectionType } from "$lib/client/components/collection/collection.type";
  import type { ICollectionThumb } from "../collection.type";

  export let item: ICollectionThumb;
</script>

{#if item.type === CollectionType.TYPED && item.properties && item.properties?.length > 0}
  <div class="flex gap-2">
    <CountBadge count={item.properties?.length} icon="ph:cube" />
  </div>
{/if}
