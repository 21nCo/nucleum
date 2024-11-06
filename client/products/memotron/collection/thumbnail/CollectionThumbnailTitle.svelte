<script lang="ts">
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { type ICollectionThumb } from "../collection.type";
  import CollectionTitleLabelPart from "../title/CollectionTitleLabelPart.svelte";
  import CollectionNodeCount from "../counts/CollectionNodeCount.svelte";
  export let item: ICollectionThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
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
    <CollectionTitleLabelPart {item} {accessPoint} />
    {#if item.isStarred}
      <Icon icon="star" class="fill-yellow-400" />
    {/if}
  </div>
  {#if arrangement === Arrangement.LIST && accessPoint === ResourceAccessPoint.BROWSER}
    <CollectionNodeCount {item} />
  {/if}
</div>
