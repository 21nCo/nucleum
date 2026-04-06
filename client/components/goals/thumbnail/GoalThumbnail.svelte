<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import { Size } from "@21n/types/size.enum";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import ResourceGridThumbnail from "@21n/components/record/thumbnail/ResourceGridThumbnail.svelte";
  import ResourceThumbnailBase from "@21n/components/record/thumbnail/ResourceThumbnailBase.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import { type IGoalThumb } from "@21n/components/goals/goal.type";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import {
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";

  import GoalThumbnailSub from "@21n/components/goals/thumbnail/GoalThumbnailSub.svelte";
  import GoalThumbnailTitle from "@21n/components/goals/thumbnail/GoalThumbnailTitle.svelte";
  import FocusItemPickOverlay from "@21n/products/pointron/focus/elements/focusitem/FocusItemPickOverlay.svelte";
  import { resolveGoalColor } from "@21n/components/goals/goal.utils";

  let {
    item: initialItem,
    arrangement = Arrangement.LIST,
    size = Size.md,
    accessPoint = ResourceAccessPoint.BROWSER,
    accessPointId,
    isApplyCustomColor = false,
    isDraggable = false,
    refreshId: initialRefreshId = new Date().getTime(),
    onClick = undefined
  }: {
    item: IGoalThumb;
    arrangement?: Arrangement;
    size?: Size.sm | Size.md;
    accessPoint?: ResourceAccessPoint;
    accessPointId: string;
    isApplyCustomColor?: boolean;
    isDraggable?: boolean;
    refreshId?: number;
    onClick?: ((event: MouseEvent) => void) | undefined;
  } = $props();

  let item = $state(initialItem);
  let refreshId = $state(initialRefreshId);
  let isHovering = $state(false);
  void size;
  const color = $derived(resolveGoalColor(item));
  const isCurrentlyFocusing = $derived(
    activeSession.isCurrentFocusItem(item.id, $currentFocusItem)
  );

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
        <button class="flex w-full items-center h-16 truncate" onclick={onClick}>
          <div class="flex flex-col gap-1 p-3 w-full">
            <GoalThumbnailTitle {item} {isCurrentlyFocusing} {color} />
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
        onclick={onClick}
        {isApplyCustomColor}
        {size}
        isHidePreview={true}
      >
        {#snippet bottom()}
        <div class="flex flex-col w-full min-h-12">
          <div class="flex flex-col gap-2">
            <GoalThumbnailTitle {item} {isCurrentlyFocusing} {color} />
            <GoalThumbnailSub {item} {isCurrentlyFocusing} {accessPoint} />
          </div>
        </div>
        {/snippet}
      </ResourceGridThumbnail>
    {/if}
  </CustomColorPropagator>
</ResourceThumbnailBase>

<ComponentBaseLayer subscribeToRecords={[item.id]} onChange={onGoalChanges} />
