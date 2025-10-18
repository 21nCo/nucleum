<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import CollectionItems from "$lib/client/components/collection/CollectionItems.svelte";
  import { dropzone } from "$lib/client/actions/dragAndDrop.action";
  import Badge from "$lib/client/elements/text/Badge.svelte";
  import { createEventDispatcher } from "svelte";
  import type { ISelectValue } from "$lib/client/types/select.type";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ICollectionView } from "../collection.type";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import type { IActiveCollectionStore } from "../collection.store";
  import { filterNodesByPropertyValue } from "../collection.utils";
  import type { Arrangement } from "$lib/client/types/direction.enum";
  const dispatch = createEventDispatcher();

  export let collection: IActiveCollectionStore;
  export let view: ICollectionView;
  export let subGroup: any;
  export let data: any;
  export let arrangement: Arrangement | undefined;
  export let density: number | undefined;
  export let isApplyCustomColor = false;
  let isCollapsed = true;

  $: _data = filterNodesByPropertyValue(data, view.subGroupBy, subGroup.value);
  $: isCollapsed = _data?.length > 0 ? false : true;

  function handleDrop(e: any) {
    dispatch("dropItem", {
      subGroup: subGroup.value,
      ...e
    });
  }
</script>

<div
  class="flex flex-col gap-2 subgroup border border-transparent rounded-md p-1 hover:border-ccs3"
  use:dropzone={{
    duringDragoverClasses: "bg-ccs3 border-ccs1",
    itemRequirement: "resource",
    onDrop: handleDrop
  }}
>
  <button
    class="label flex justify-between gap-2 w-full p-1 rounded-md"
    on:click={() => {
      isCollapsed = !isCollapsed;
    }}
  >
    <span class="flex gap-2 items-center">
      {subGroup.label}
      <Badge text={_data.length} {isApplyCustomColor} />
    </span>
    <Button
      icon={!isCollapsed ? "chevron-down" : "chevron-up"}
      size={Size.sm}
    />
  </button>
  {#if !isCollapsed}
    <div class="w-full flex flex-col gap-4">
      <CollectionItems
        items={_data}
        {arrangement}
        {isApplyCustomColor}
        isHidePreview={view.isHideThumbnailPreview}
        isHideTitle={view.isHideThumbnailTitle}
        {density}
        isDraggable={true}
        accessPoint={ResourceAccessPoint.COLLECTION}
        accessPointId={collection?.id}
        visibleProps={$collection?.properties?.filter((x) =>
          view.properties?.some(resourceInList(x))
        )}
      />
    </div>
  {/if}
</div>
