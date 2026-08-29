<script lang="ts">
  import {
    ResourceAccessPoint,
    ResourceAccessPointState
  } from "@21n/data/datafn/resource.type";
  import Icon from "@21n/elements/Icon.svelte";
  import { Arrangement } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { type ICollectionThumb } from "@21n/components/collection/collection.type";
  import CollectionThumbnailLabel from "@21n/components/collection/thumbnail/CollectionThumbnailLabel.svelte";
  import CollectionItemCount from "@21n/components/collection/counts/CollectionItemCount.svelte";
  import RecordStarStatusFeedback from "@21n/components/record/RecordStarStatusFeedback.svelte";
  let {
    item,
    arrangement = Arrangement.LIST,
    accessPoint = ResourceAccessPoint.BROWSER,
    accessPointState = ResourceAccessPointState.DEFAULT,
    itemCount = undefined
  }: {
    item: ICollectionThumb;
    arrangement?: Arrangement;
    accessPoint?: ResourceAccessPoint;
    accessPointState?: ResourceAccessPointState;
    itemCount?: number | undefined;
  } = $props();
</script>

<div
  class={cn({
    "grid grid-cols-[1fr_auto] flex-1 gap-1": arrangement === Arrangement.LIST,
    "flex w-full":
      arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY
  })}
>
  <div
    class={cn("text-b2", {
      "flex items-center gap-3 min-w-0": arrangement === Arrangement.LIST,
      "flex w-full justify-between":
        arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY
    })}
  >
    <CollectionThumbnailLabel {item} />
    {#if accessPoint !== ResourceAccessPoint.BROWSER}
      <RecordStarStatusFeedback isStarred={item.isStarred} />
    {/if}
  </div>
  {#if arrangement === Arrangement.LIST && accessPoint === ResourceAccessPoint.BROWSER && accessPointState === ResourceAccessPointState.DEFAULT}
    <CollectionItemCount {item} count={itemCount} />
  {/if}
</div>
