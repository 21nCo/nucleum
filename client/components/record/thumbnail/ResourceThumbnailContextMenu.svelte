<script lang="ts">
  import ContextMenuAction from "@21n/elements/contextMenu/ContextMenuAction.svelte";
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher } from "svelte";
  import { resolveCollectionContextMenu } from "@21n/components/collection/collection.store";
  import { resolveNodeContextMenu } from "@21n/products/memotron/node/node.store";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { Arrangement, Placement } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { resolveGoalContextMenu } from "@21n/components/goals/goal.store";
  import { resolveTaskContextMenu } from "@21n/components/tasks/task.store";
  import context from "@21n/stores/context.store";
  import view from "@21n/stores/view.store";

  const dispatch = createEventDispatcher();
  export let item: any;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointId: IRecordId | undefined = undefined;
  export let accessPointContext: string | undefined = undefined;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let isHidePreview: boolean = false;
  export let isApplyCustomColor: boolean = false;
  export let size: Size.sm | Size.md | Size.lg = Size.md;
  export let bgSize: Size.sm | Size.md | Size.lg = Size.md;
  export let isInline: boolean = false;
  export let icon: string = "more";
  function onAction(e: CustomEvent<string>) {
    if (e.detail === "star") item.isStarred = !item.isStarred;
    dispatch("action", { action: e.detail, id: item.id });
  }
  function resolveContextMenu(item: any, accessPoint: ResourceAccessPoint) {
    const resourceType = determineResourceType(item.id);
    if (resourceType === Resource.node) {
      return resolveNodeContextMenu(item, accessPoint, {
        accessPointId,
        accessPointContext
      });
    } else if (resourceType === Resource.collection) {
      return resolveCollectionContextMenu(item, accessPoint);
    } else if (resourceType === Resource.goal) {
      return resolveGoalContextMenu(item, accessPoint);
    } else if (resourceType === Resource.task) {
      return resolveTaskContextMenu(item, accessPoint, { accessPointId });
    } else {
      return [];
    }
  }
</script>

<button
  data-testid="thumbnail-context-menu-trigger"
  class={cn(
    "flex gap-2 p--1",
    {
      "absolute top-0 right-0": !isInline,
      "bg-gradient-to-r from-transparent via-bgs2/90 to-bgs2 rounded-md":
        $context.isTouchDevice,
      "h-full flex-col justify-center": arrangement === Arrangement.LIST
    },
    !isInline &&
      arrangement !== Arrangement.LIST && {
        "border rounded-md": true,
        "m-3": !isHidePreview,
        "m-1": isHidePreview,
        "bg-ccs4 border-ccs2": isApplyCustomColor,
        "bg-bgs2 border-brs3": !isApplyCustomColor
      }
  )}
  on:click|stopPropagation
>
  <div class="flex">
    <slot name="right" />
    <div
      class={cn(
        !isInline &&
          arrangement === Arrangement.LIST && {
            "mx-2 border rounded-md": arrangement === Arrangement.LIST,
            "bg-ccs4 border-ccs2":
              arrangement === Arrangement.LIST && isApplyCustomColor,
            "bg-bgs2 border-brs3":
              arrangement === Arrangement.LIST && !isApplyCustomColor
          }
      )}
    >
      <ContextMenuAction
        id="resourceThumbnailContextMenu"
        menuResolver={() => resolveContextMenu(item, accessPoint)}
        {size}
        actionSize={bgSize ?? size}
        on:action={onAction}
        position={Placement.BottomCenter}
        isRenderAsSibling={!$view.isConstrainedWidth}
        {icon}
      />
    </div>
  </div>
</button>
