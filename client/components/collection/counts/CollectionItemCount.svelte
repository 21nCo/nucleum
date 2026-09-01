<script lang="ts">
  import type { ICollectionThumb } from "@21n/components/collection/collection.type";
  import CountBadge from "@21n/components/collection/counts/CountBadge.svelte";

  let {
    item,
    count = undefined,
    isShowLabel = false
  }: {
    item: ICollectionThumb;
    count?: number | undefined;
    isShowLabel?: boolean;
  } = $props();

  function resolveLabel() {
    if (!isShowLabel) return undefined;
    const label = item.resource ?? "item";
    return count === 1 ? label : `${label}s`;
  }
</script>

{#if count}
  <CountBadge {count} label={resolveLabel()} />
{/if}
