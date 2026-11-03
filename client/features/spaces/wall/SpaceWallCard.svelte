<script lang="ts">
  import Icon from "@21n/ui/elements/Icon.svelte";
  import AvatarRenderer from "@21n/ui/elements/avatarPicker/AvatarRenderer.svelte";
  import type { IAvatar } from "@21n/ui/elements/avatarPicker/avatar.type";
  import { Arrangement } from "@21n/ui/elements/direction.enum";
  import { Size } from "@21n/ui/elements/size.enum";
  import { cn } from "@21n/ui/environment/presentation";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import { resolveResourceIcon } from "@nucleum/datafn/resource.utils";
  import { NodeType } from "@nucleum/schema/legacy/node-type.enum";
  import CollectionThumbnail from "@nucleum/features/collections/thumbnail/CollectionThumbnail.svelte";
  import type { ICollectionThumb } from "@nucleum/features/collections/collection.type";
  import NodeThumbnail from "@nucleum/features/memory/node/thumbnail/NodeThumbnail.svelte";
  import type { INodeThumb } from "@nucleum/features/memory/node/node.type";
  import GoalThumbnail from "@nucleum/features/focus/goals/thumbnail/GoalThumbnail.svelte";
  import type { IObjectiveThumb } from "@nucleum/features/focus/goals/goal.type";
  import SpaceThumbnail from "@nucleum/features/spaces/thumbnail/SpaceThumbnail.svelte";
  import type {
    ISpace,
    ISpaceResourceNavItem
  } from "@nucleum/features/spaces/space.type";
  import {
    isSpaceItemBlocked,
    resolveSpaceItemStatus,
    resolveTargetLabel
  } from "@nucleum/features/spaces/space.utils";
  import type { ISpaceWallContext } from "@nucleum/features/spaces/wall/space-wall.type";
  import SpaceWallPageCard from "@nucleum/features/spaces/wall/SpaceWallPageCard.svelte";

  let {
    item,
    wall
  }: {
    item: ISpaceResourceNavItem;
    wall: ISpaceWallContext;
  } = $props();

  const resourceId = $derived(item.resourceId.toString());
  const target = $derived(wall.targets[resourceId]);
  const status = $derived(
    resolveSpaceItemStatus({
      item,
      product: wall.product,
      target,
      isTargetsLoaded: wall.isTargetsLoaded,
      loopIds: wall.loopIds
    })
  );
  const isBlocked = $derived(isSpaceItemBlocked(status));
  const label = $derived(
    (target ? resolveTargetLabel(target) : undefined) ||
      item.label ||
      "Untitled"
  );
  const avatar = $derived(
    (target?.avatar as IAvatar | undefined) ?? item.avatar
  );
  const isSubSpace = $derived(item.resourceType === Resource.space);
  const isMarkdownPage = $derived(
    item.resourceType === Resource.node &&
      target?.contentType === NodeType.NODULAR_MARKDOWN
  );

  function open(event?: MouseEvent) {
    event?.stopPropagation();
    if (isBlocked) return;
    if (isSubSpace) wall.onFocusSpace(item);
    else wall.onOpen(item);
  }

  function asNode(record: Record<string, unknown>) {
    return record as unknown as INodeThumb;
  }

  function asCollection(record: Record<string, unknown>) {
    return record as unknown as ICollectionThumb;
  }

  function asGoal(record: Record<string, unknown>) {
    return record as unknown as IObjectiveThumb;
  }

  function asSpace(record: Record<string, unknown>) {
    return record as unknown as ISpace;
  }
</script>

<li
  class="relative flex flex-col min-w-0"
  data-id={item.id}
  data-testid="space-wall-card"
  data-resource-id={resourceId}
>
  {#if status}
    <button
      type="button"
      class={cn(
        "flex items-center gap-3 w-full p-3 rounded-md border border-brs2 bg-bgs2 text-left",
        {
          "cursor-not-allowed": isBlocked,
          "notouch:hover:border-brs4": !isBlocked
        }
      )}
      aria-disabled={isBlocked ? "true" : undefined}
      title={status.text}
      onclick={() => open()}
    >
      <span
        class="flex w-8 h-8 shrink-0 items-center justify-center rounded-md bg-bgs3 opacity-50"
      >
        {#if avatar}
          <AvatarRenderer {avatar} size={Size.sm} />
        {:else}
          <Icon
            icon={resolveResourceIcon(item.resourceType)}
            size={Size.sm}
            class="stroke-fgs2"
          />
        {/if}
      </span>
      <span class="flex flex-col min-w-0">
        <span
          class={cn("truncate text-b2 text-fgs3", {
            "line-through": status.kind === "trashed"
          })}
        >
          {label}
        </span>
        <span class="text-b4 text-fgs3">{status.text}</span>
      </span>
    </button>
  {:else if !target}
    <div
      class="w-full h-44 rounded-md border border-brs2 bg-bgs2 animate-pulse"
      aria-hidden="true"
    ></div>
  {:else if isMarkdownPage}
    <SpaceWallPageCard
      nodeId={resourceId}
      {label}
      {avatar}
      onOpen={() => wall.onOpen(item)}
      onOpenHeading={(headingId) => wall.onOpenHeading(item, headingId)}
    />
  {:else if isSubSpace}
    <SpaceThumbnail
      item={asSpace(target)}
      arrangement={Arrangement.GRID}
      size={Size.md}
      accessPoint={ResourceAccessPoint.SPACE}
      onClick={open}
    />
  {:else if item.resourceType === Resource.node}
    <NodeThumbnail
      item={asNode(target)}
      arrangement={Arrangement.GRID}
      accessPoint={ResourceAccessPoint.SPACE}
      accessPointId={wall.spaceId}
      onClick={open}
    />
  {:else if item.resourceType === Resource.collection}
    <CollectionThumbnail
      item={asCollection(target)}
      arrangement={Arrangement.GRID}
      size={Size.md}
      accessPoint={ResourceAccessPoint.SPACE}
      itemCount={wall.collectionCounts[resourceId]}
      onClick={open}
    />
  {:else if item.resourceType === Resource.objective}
    <GoalThumbnail
      item={asGoal(target)}
      arrangement={Arrangement.GRID}
      accessPoint={ResourceAccessPoint.SPACE}
      accessPointId={wall.spaceId}
      onClick={open}
    />
  {/if}
  {#if wall.isEditMode}
    <button
      type="button"
      class="absolute -top-2 -left-2 z-10 flex items-center justify-center w-7 h-7 rounded-full border border-brs2 bg-bgs1 shadow-sm notouch:hover:bg-bgs2"
      aria-label={`Remove ${label}`}
      title="Remove from space"
      data-testid="space-wall-remove"
      onclick={(event) => {
        event.stopPropagation();
        wall.onDelete(item, label);
      }}
    >
      <Icon icon="trash" size={Size.sm} class="stroke-ars1" />
    </button>
  {/if}
</li>
