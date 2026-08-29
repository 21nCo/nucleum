<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import CollectionThumbnail from "@21n/components/collection/thumbnail/CollectionThumbnail.svelte";
  import CombinationThumbnail from "@21n/components/combination/thumbnail/CombinationThumbnail.svelte";
  import NodeThumbnail from "@21n/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import { Size } from "@21n/types/size.enum";
  import {
    ResourceAccessPoint,
    AccessMode,
    ResourceAccessPointState
  } from "@21n/data/datafn/resource.type";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import FileView from "@21n/components/files/FileView.svelte";
  import type { INodeThumb } from "@21n/products/memotron/node/node.type";
  import type {
    ICollection,
    ICollectionThumb
  } from "@21n/components/collection/collection.type";
  import type { IProperty } from "@21n/components/collection/properties/property.type";
  import type { ISideNavCombination } from "@21n/components/combination/combination.type";
  import type { IFile } from "@21n/components/files/file.type";
  import { determineResourceType } from "@21n/data/datafn/resource.utils";
  import NodeItems from "@21n/products/memotron/node/NodeRecords.svelte";
  import LibraryLoadingPulse from "@21n/components/library/LibraryLoadingPulse.svelte";
  import ObjectiveThumbnail from "@21n/components/goals/thumbnail/GoalThumbnail.svelte";
  import TaskThumbnail from "@21n/components/tasks/TaskThumbnail.svelte";
  import TaskRecords from "@21n/components/tasks/TaskRecords.svelte";
  import EventThumbnail from "@21n/components/events/EventThumbnail.svelte";
  import type { IObjectiveThumb } from "@21n/components/goals/goal.type";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import type { ICalendarEvent } from "@21n/components/events/event.type";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { tabs } from "@21n/layout/topNav/tabs/tabs.store";
  import { stringify } from "@21n/shared-utils/json.utils";
  import { appStore } from "@21n/stores/app.store";
  import { datafn } from "@21n/stores/datafn.store";
  import { toSvelteDataStore } from "@datafn/svelte";
  import { datafnHeavyComputedSignalOptions } from "@21n/data/datafn/signalCache";
  type RecordItem =
    | INodeThumb
    | ICollection
    | IFile
    | ISideNavCombination
    | IObjectiveThumb
    | ITaskThumb
    | ICalendarEvent;

  let {
    data = [],
    resource = Resource.node,
    arrangement = Arrangement.LIST,
    defaultAccessMode = AccessMode.POP,
    size = Size.md,
    accessPoint = ResourceAccessPoint.BROWSER,
    accessPointState = ResourceAccessPointState.DEFAULT,
    isPreventDefault = false,
    width = 290,
    isShowLoadingPulseAtTheEnd = false,
    isShowBottomSpacer = false,
    visibleProps = [],
    onClick: onRecordClick = undefined
  }: {
    data?: RecordItem[];
    resource?: Resource;
    arrangement?: Arrangement;
    defaultAccessMode?: AccessMode;
    size?: Size.sm | Size.md;
    accessPoint?: ResourceAccessPoint;
    accessPointState?: ResourceAccessPointState;
    isPreventDefault?: boolean;
    width?: number;
    isShowLoadingPulseAtTheEnd?: boolean;
    isShowBottomSpacer?: boolean;
    visibleProps?: IProperty[];
    onClick?: ((event: CustomEvent<RecordItem>) => void) | undefined;
  } = $props();
  let parentBgIndex = 1;
  let multiSelectContext = $derived({
    resource,
    accessPoint
  });
  const collectionIds = $derived.by(() =>
    data
      .filter((item) =>
        resource === Resource.collection ||
        resource === Resource.everything ||
        resource === Resource.unknown
          ? determineResourceType(item.id) === Resource.collection
          : false
      )
      .map((item) => item.id.toString())
  );
  const collectionCountsStore = $derived.by(() =>
    toSvelteDataStore(
      datafn.relationCountsSignal(
        {
          resource: Resource.collection,
          relation: "items",
          ids: collectionIds,
          targetFilters: {
            isArchived: { $ne: true },
            trashedAt: { $is_null: true },
            isAncestorInactive: { $ne: true }
          }
        },
        datafnHeavyComputedSignalOptions
      ),
      { initialData: {} }
    )
  );

  function asNodeThumb(item: RecordItem): INodeThumb {
    return item as INodeThumb;
  }

  function asCollection(item: RecordItem): ICollectionThumb {
    return item as unknown as ICollectionThumb;
  }

  function asCombination(item: RecordItem): ISideNavCombination {
    return item as ISideNavCombination;
  }

  function asGoal(item: RecordItem): IObjectiveThumb {
    return item as IObjectiveThumb;
  }

  function asTask(item: RecordItem): ITaskThumb {
    return item as ITaskThumb;
  }

  function asFile(item: RecordItem): IFile {
    return item as IFile;
  }

  function asEvent(item: RecordItem): ICalendarEvent {
    return item as ICalendarEvent;
  }

  function asNodeList(items: RecordItem[]): INodeThumb[] {
    return items as INodeThumb[];
  }

  function asTaskList(items: RecordItem[]): ITaskThumb[] {
    return items as ITaskThumb[];
  }

  function resolveMouseEvent(event: MouseEvent | CustomEvent) {
    return event instanceof MouseEvent ? event : undefined;
  }

  function handleClick(e: MouseEvent | CustomEvent, item: RecordItem) {
    if (isPreventDefault) {
      const clickEvent = new CustomEvent<any>("click", { detail: item });
      onRecordClick?.(clickEvent);
      return;
    }
    const state = bulkEditStore.getState();
    const isMatchingContext = state.context
      ? stringify(state.context, { isPreventReplacer: true }) ===
        stringify(multiSelectContext, { isPreventReplacer: true })
      : false;
    const result = isMatchingContext
      ? bulkEditStore.clickHandler(item.id)
      : false;
    if (!result) {
      appStore.resourceClickHandler(resolveMouseEvent(e), item.id, {
        defaultTo: defaultAccessMode,
        origin: accessPoint
      });
    }
  }
</script>

<div class="flex flex-col w-full h-full">
  <!-- <div class={cn("flex h-full w-full gap-4 flex-row flex-wrap content-start")}> -->
  {#if resource === Resource.node && arrangement === Arrangement.MASONRY}
    <NodeItems
      nodes={asNodeList(data)}
      {arrangement}
      density={3}
      {accessPoint}
    />
  {:else if resource === Resource.task && accessPoint === ResourceAccessPoint.LIBRARY}
    <TaskRecords
      data={asTaskList(data)}
      {arrangement}
      {accessPoint}
      {parentBgIndex}
    />
  {:else}
    <div
      style={arrangement === Arrangement.GRID &&
      accessPoint !== ResourceAccessPoint.BROWSER
        ? `--colw: ${width}px`
        : undefined}
      class={cn(
        `h-full w-full content-start`,
        {
          "flex flex-col": arrangement === Arrangement.LIST,
          "grid grid-cols-[repeat(auto-fill,minmax(var(--colw),1fr))]":
            arrangement === Arrangement.GRID &&
            accessPoint !== ResourceAccessPoint.BROWSER,
          "grid grid-cols-2":
            arrangement === Arrangement.GRID &&
            accessPoint === ResourceAccessPoint.BROWSER,
          "cw:gap-3 gap-4": arrangement === Arrangement.GRID
        },
        arrangement === Arrangement.LIST && {
          "gap-2": resource !== Resource.node,
          "gap-6": resource === Resource.node
        }
      )}
    >
      {#each data as item (item)}
        {#if resource === Resource.everything || resource === Resource.unknown}
          {@const resourceType = determineResourceType(item.id)}
          {#if resourceType === Resource.node}
            <NodeThumbnail
              item={asNodeThumb(item)}
              {accessPoint}
              accessPointId={item.id}
              {parentBgIndex}
              {arrangement}
              onClick={(event) => handleClick(event, item)}
            />
          {:else if resourceType === Resource.collection}
            <CollectionThumbnail
              item={asCollection(item)}
              {size}
              {accessPoint}
              {accessPointState}
              {arrangement}
              itemCount={$collectionCountsStore[item.id.toString()]}
              onClick={(e) => handleClick(e, item)}
            />
          {:else if resourceType === Resource.space}
            <CombinationThumbnail
              item={asCombination(item)}
              {size}
              {accessPoint}
              {accessPointState}
              {arrangement}
              onClick={(e) => handleClick(e, item)}
            />
          {:else if resourceType === Resource.objective}
            <ObjectiveThumbnail
              item={asGoal(item)}
              {accessPoint}
              accessPointId={item.id}
              {arrangement}
              {visibleProps}
              onClick={(e) => handleClick(e, item)}
            />
          {:else if resourceType === Resource.task}
            <TaskThumbnail
              item={asTask(item)}
              {accessPoint}
              {arrangement}
              {parentBgIndex}
            />
          {:else if resourceType === Resource.event}
            <EventThumbnail
              item={asEvent(item)}
              {accessPoint}
              {arrangement}
              onClick={(e) => handleClick(e, item)}
            />
          {:else}
            <div
              class="h-72 w-80 border border-brs3 rounded-md hover:border-aps1 grow"
            >
              {item.label ?? "Untitled"}
            </div>
          {/if}
        {:else if resource === Resource.node && arrangement !== Arrangement.MASONRY}
          <NodeThumbnail
            item={asNodeThumb(item)}
            {accessPoint}
            accessPointId={item.id}
            {parentBgIndex}
            {arrangement}
            onClick={(event) => handleClick(event, item)}
          />
        {:else if resource === Resource.objective && arrangement !== Arrangement.MASONRY}
          <ObjectiveThumbnail
            item={asGoal(item)}
            {accessPoint}
            accessPointId={item.id}
            {arrangement}
            {visibleProps}
            onClick={(e) => handleClick(e, item)}
          />
        {:else if resource === Resource.task && arrangement !== Arrangement.MASONRY}
          <TaskThumbnail
            item={asTask(item)}
            {accessPoint}
            {parentBgIndex}
            {arrangement}
            onClick={(e) => handleClick(e, item)}
          />
        {:else if resource === Resource.collection}
          <CollectionThumbnail
            item={asCollection(item)}
            {size}
            {accessPoint}
            {accessPointState}
            {arrangement}
            itemCount={$collectionCountsStore[item.id.toString()]}
            onClick={(e) => handleClick(e, item)}
          />
        {:else if resource === Resource.space}
          <CombinationThumbnail
            item={asCombination(item)}
            {size}
            {accessPoint}
            {accessPointState}
            {arrangement}
            onClick={(e) => handleClick(e, item)}
          />
        {:else if resource === Resource.file}
          <button class="h-40" onclick={(e) => handleClick(e, item)}>
            <FileView
              file={asFile(item)}
              isLazyLoad={true}
              isUseThumbnailIfAvailable={true}
              class={cn("h-full w-full rounded-md object-cover", {})}
            />
          </button>
        {:else if resource === Resource.event}
          <EventThumbnail
            item={asEvent(item)}
            {accessPoint}
            {arrangement}
            onClick={(e) => handleClick(e, item)}
          />
        {/if}
      {/each}
      {#if isShowLoadingPulseAtTheEnd}
        <LibraryLoadingPulse {resource} {arrangement} isTail={true} />
      {/if}
      {#if isShowBottomSpacer}
        <ScrollViewBottomSpacer />
      {/if}
    </div>
  {/if}
</div>
