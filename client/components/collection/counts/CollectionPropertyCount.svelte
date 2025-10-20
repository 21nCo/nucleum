<script lang="ts">
  import CountBadge from "@21n/components/collection/counts/CountBadge.svelte";
  import { CollectionType } from "@21n/components/collection/collection.type";
  import type { ICollectionThumb } from "@21n/components/collection/collection.type";
  export let item: ICollectionThumb;
  export let isShowLabel: boolean = true;
</script>

{#if item.type === CollectionType.TYPED && item.properties && item.properties?.length > 0}
  <div class="flex gap-2">
    <CountBadge
      count={item.properties?.length}
      icon="cube"
      label={isShowLabel ? "properties" : undefined}
    />
  </div>
{/if}
