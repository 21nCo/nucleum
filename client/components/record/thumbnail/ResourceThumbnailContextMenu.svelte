<script lang="ts">
  import type { Snippet } from "svelte";
  import ContextMenuAction from "@21n/elements/contextMenu/ContextMenuAction.svelte";
  import { Size } from "@21n/types/size.enum";
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
  let {
    item = $bindable(),
    accessPoint = ResourceAccessPoint.BROWSER,
    accessPointId = undefined,
    accessPointContext = undefined,
    arrangement = Arrangement.LIST,
    isHidePreview = false,
    isApplyCustomColor = false,
    size = Size.md,
    bgSize = Size.md,
    isInline = false,
    icon = "more",
    onAction = undefined,
    right = undefined
  }: {
    item: any;
    accessPoint?: ResourceAccessPoint;
    accessPointId?: IRecordId | undefined;
    accessPointContext?: string | undefined;
    arrangement?: Arrangement;
    isHidePreview?: boolean;
    isApplyCustomColor?: boolean;
    size?: Size.sm | Size.md | Size.lg;
    bgSize?: Size.sm | Size.md | Size.lg;
    isInline?: boolean;
    icon?: string;
    onAction?:
      | ((event: CustomEvent<{ action: string; id: string }>) => void)
      | undefined;
    right?: Snippet | undefined;
  } = $props();
  function handleAction(e: CustomEvent<string>) {
    if (e.detail === "star") item.isStarred = !item.isStarred;
    const actionEvent = new CustomEvent<{ action: string; id: string }>(
      "action",
      { detail: { action: e.detail, id: item.id } }
    );
    onAction?.(actionEvent);
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
  onclick={(event) => event.stopPropagation()}
>
  <div class="flex">
    {@render right?.()}
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
        onAction={handleAction}
        position={Placement.BottomCenter}
        isRenderAsSibling={!$view.isConstrainedWidth}
        {icon}
      />
    </div>
  </div>
</button>
