<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import CollectionThumbnail from "@21n/components/collection/thumbnail/CollectionThumbnail.svelte";
  import CombinationThumbnail from "@21n/components/combination/thumbnail/CombinationThumbnail.svelte";
  import NodeThumbnail from "@21n/products/memotron/node/thumbnail/NodeThumbnail.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { Size } from "@21n/types/size.enum";
  import {
    ResourceAccessPoint,
    AccessMode,
    ResourceAccessPointState
  } from "@21n/components/flux/resourceStores/resource.type";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import FileView from "@21n/components/files/FileView.svelte";
  import { createEventDispatcher } from "svelte";
  import type { INodeThumb } from "@21n/products/memotron/node/node.type";
  import type {
    ICollection,
    ICollectionThumb
  } from "@21n/components/collection/collection.type";
  import type { ISideNavCombination } from "@21n/components/combination/combination.type";
  import type { IFile } from "@21n/components/files/file.type";
  import { determineResourceType } from "@21n/components/flux/resourceStores/resource.utils";
  import NodeItems from "@21n/products/memotron/node/NodeRecords.svelte";
  import LibraryLoadingPulse from "@21n/components/library/LibraryLoadingPulse.svelte";
  import GoalThumbnail from "@21n/components/goals/thumbnail/GoalThumbnail.svelte";
  import TaskThumbnail from "@21n/components/tasks/TaskThumbnail.svelte";
  import TaskRecords from "@21n/components/tasks/TaskRecords.svelte";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { tabs } from "@21n/layout/topNav/tabs/tabs.store";
  import { stringify } from "@21n/shared-utils/json.utils";
  import { appStore } from "@21n/stores/app.store";
  const dispatch = createEventDispatcher();
  type RecordItem =
    | INodeThumb
    | ICollection
    | IFile
    | ISideNavCombination
    | IGoalThumb
    | ITaskThumb;

  export let data: RecordItem[] = [];
  export let resource: Resource = Resource.node;
  export let arrangement: Arrangement = Arrangement.LIST;
  export let defaultAccessMode: AccessMode = AccessMode.POP;
  export let size: Size.sm | Size.md = Size.md;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.BROWSER;
  export let accessPointState: ResourceAccessPointState =
    ResourceAccessPointState.DEFAULT;
  export let isPreventDefault = false;
  export let width: number = 290;
  export let isShowLoadingPulseAtTheEnd: boolean = false;
  export let isShowBottomSpacer: boolean = false;
  let parentBgIndex = 1;
  $: multiSelectContext = {
    resource,
    accessPoint
  };

  function asNodeThumb(item: RecordItem): INodeThumb {
    return item as INodeThumb;
  }

  function asCollection(item: RecordItem): ICollectionThumb {
    return item as unknown as ICollectionThumb;
  }

  function asCombination(item: RecordItem): ISideNavCombination {
    return item as ISideNavCombination;
  }

  function asGoal(item: RecordItem): IGoalThumb {
    return item as IGoalThumb;
  }

  function asTask(item: RecordItem): ITaskThumb {
    return item as ITaskThumb;
  }

  function asFile(item: RecordItem): IFile {
    return item as IFile;
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

  function onClick(e: MouseEvent | CustomEvent, item: RecordItem) {
    if (isPreventDefault) {
      dispatch("click", item);
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
              on:click={(e) => onClick(e, item)}
            />
          {:else if resourceType === Resource.collection}
            <CollectionThumbnail
              item={asCollection(item)}
              {size}
              {accessPoint}
              {accessPointState}
              {arrangement}
              on:click={(e) => onClick(e, item)}
            />
          {:else if resourceType === Resource.combination}
            <CombinationThumbnail
              item={asCombination(item)}
              {size}
              {accessPoint}
              {accessPointState}
              {arrangement}
              on:click={(e) => onClick(e, item)}
            />
          {:else if resourceType === Resource.goal}
            <GoalThumbnail
              item={asGoal(item)}
              {accessPoint}
              accessPointId={item.id}
              {arrangement}
              on:click={(e) => onClick(e, item)}
            />
          {:else if resourceType === Resource.task}
            <TaskThumbnail
              item={asTask(item)}
              {accessPoint}
              {arrangement}
              {parentBgIndex}
            />
          {:else}
            <div
              class="h-72 w-80 border border-brs3 rounded-md hover:border-aps1 grow"
            >
              {item.label}
            </div>
          {/if}
        {:else if resource === Resource.node && arrangement !== Arrangement.MASONRY}
          <NodeThumbnail
            item={asNodeThumb(item)}
            {accessPoint}
            accessPointId={item.id}
            {parentBgIndex}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if resource === Resource.goal && arrangement !== Arrangement.MASONRY}
          <GoalThumbnail
            item={asGoal(item)}
            {accessPoint}
            accessPointId={item.id}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if resource === Resource.task && arrangement !== Arrangement.MASONRY}
          <TaskThumbnail
            item={asTask(item)}
            {accessPoint}
            {parentBgIndex}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if resource === Resource.collection}
          <CollectionThumbnail
            item={asCollection(item)}
            {size}
            {accessPoint}
            {accessPointState}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if resource === Resource.combination}
          <CombinationThumbnail
            item={asCombination(item)}
            {size}
            {accessPoint}
            {accessPointState}
            {arrangement}
            on:click={(e) => onClick(e, item)}
          />
        {:else if resource === Resource.file}
          <button class="h-40" on:click={(e) => onClick(e, item)}>
            <FileView
              file={asFile(item)}
              isLazyLoad={true}
              isUseThumbnailIfAvailable={true}
              class={cn("h-full w-full rounded-md object-cover", {})}
            />
          </button>
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
