<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { Size } from "$lib/client/types/size.enum";
  import { ResourceAccessPoint } from "$lib/client/components/flux/resourceStores/resource.type";
  import ResourceGridThumbnail from "../../record/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "../../record/thumbnail/ResourceThumbnailBase.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import { type IGoalThumb } from "../goal.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import {
    currentFocusItem,
    focusItemsStore
  } from "$lib/client/products/pointron/focus/session.store";
  import { resolveIfCurrentFocusItem } from "$lib/client/products/pointron/focus/session.utils";

  import GoalThumbnailSub from "./GoalThumbnailSub.svelte";
  import GoalThumbnailTitle from "./GoalThumbnailTitle.svelte";
  import FocusItemPickOverlay from "$lib/client/products/pointron/focus/elements/focusitem/FocusItemPickOverlay.svelte";
  import { resolveGoalColor } from "../goal.utils";
  export let item: IGoalThumb;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: string;
  export let isApplyCustomColor: boolean = false;
  export let isDraggable: boolean = false;
  export let refreshId: number = new Date().getTime();
  $: color = resolveGoalColor(item);
  $: isCurrentlyFocusing = resolveIfCurrentFocusItem(
    $focusItemsStore,
    item.id,
    $currentFocusItem
  );

  let isHovering: boolean = false;

  function onGoalChanges(e: any) {
    const data = e.detail?.params?.record;
    if (data) {
      item = { ...item, ...data };
      refreshId = new Date().getTime();
    }
  }
</script>

<ResourceThumbnailBase
  bind:item
  {accessPoint}
  {accessPointId}
  {isDraggable}
  {isApplyCustomColor}
  {arrangement}
  isHidePreview={true}
  bind:isHovering
  on:action
>
  <CustomColorPropagator {color}>
    {#if arrangement === Arrangement.LIST}
      <div
        class={cn(
          "relative flex flex-col w-full border rounded-md truncate",
          {
            "bg-ccs4 border border-ccs1": isCurrentlyFocusing
          },
          !isCurrentlyFocusing && {
            "bg-ccs5 notouch:hover:bg-ccs4 active:bg-ccs4 border-ccs2":
              isApplyCustomColor,
            "border-transparent notouch:hover:border-brs3 active:border-brs3 px-1":
              !isApplyCustomColor,
            "bg-bgs2 px-2": !isApplyCustomColor
          }
        )}
      >
        <button class="flex w-full items-center h-16 truncate" on:click>
          <div class="flex flex-col gap-1 p-3 w-full">
            <GoalThumbnailTitle
              {item}
              {isCurrentlyFocusing}
              {color}
              isShowStarStatus={accessPoint !== ResourceAccessPoint.BROWSER}
            />
            <GoalThumbnailSub {item} {isCurrentlyFocusing} {accessPoint} />
          </div>
          {#if accessPoint === ResourceAccessPoint.PICKER}
            <FocusItemPickOverlay {isHovering} {item} />
          {/if}
        </button>
      </div>
    {:else if arrangement === Arrangement.GRID}
      <ResourceGridThumbnail
        {item}
        on:click
        {isApplyCustomColor}
        {size}
        isHidePreview={true}
      >
        <div slot="bottom" class="flex flex-col w-full min-h-12">
          <div class="flex flex-col gap-2">
            <GoalThumbnailTitle
              {item}
              {isCurrentlyFocusing}
              {color}
              isShowStarStatus={accessPoint !== ResourceAccessPoint.BROWSER}
            />
            <GoalThumbnailSub {item} {isCurrentlyFocusing} {accessPoint} />
          </div>
        </div>
      </ResourceGridThumbnail>
    {/if}
  </CustomColorPropagator>
</ResourceThumbnailBase>

<ComponentBaseLayer subscribeToRecords={[item.id]} on:change={onGoalChanges} />
