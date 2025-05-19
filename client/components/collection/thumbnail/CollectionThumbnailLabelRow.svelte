<script lang="ts">
  import {
    ResourceAccessPoint,
    ResourceAccessPointState
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { type ICollectionThumb } from "../collection.type";
  import CollectionThumbnailLabel from "./CollectionThumbnailLabel.svelte";
  import CollectionNodeCount from "../counts/CollectionItemCount.svelte";
  import RecordStarStatusFeedback from "../../record/RecordStarStatusFeedback.svelte";
  export let item: ICollectionThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointState: ResourceAccessPointState =
    ResourceAccessPointState.DEFAULT;
</script>

<div
  class={cn({
    "grid grid-cols-[1fr_auto] flex-1 gap-1": arrangement === Arrangement.LIST,
    "flex w-full":
      arrangement === Arrangement.GRID || arrangement === Arrangement.MASONRY
  })}
>
  <div
    class={cn({
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
    <CollectionNodeCount {item} />
  {/if}
</div>
