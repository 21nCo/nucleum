<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { onMount } from "svelte";
  import {
    BulkEditor,
    SearchStore
  } from "$lib/client/components/record/record.store";
  import {
    TaskDueDateFilter,
    TaskSubTypeForSwitcher,
    type ITaskThumb
  } from "$lib/client/components/tasks/task.type";
  import {
    isValidArray,
    isValidArrayWithData
  } from "$lib/shared/utils/obj.utils";
  import TaskRecords from "./TaskRecords.svelte";
  import {
    IResourceFilterDateGrouping,
    type IRecordId
  } from "$lib/client/types/data.type";
  import InlineSearchBar from "$lib/client/elements/InlineSearchBar.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { page } from "$app/stores";
  import type { SubType } from "../library/library.type";
  import LibrarySubTypeSwitcher from "../library/LibrarySubTypeSwitcher.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  import Toggle from "$lib/client/elements/toggle/Toggle.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import DatePickerRow from "$lib/client/elements/datetime/DatePickerRow.svelte";
  import AbsoluteTimeRangePopoverV2 from "$lib/client/elements/datetime/absolute/AbsoluteTimeRangePopoverV2.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { popover } from "$lib/client/actions/popover.action";
  import {
    compareDates,
    formatDate,
    isSameDay
  } from "$lib/client/utils/time.utils";
  import AddNewTaskInline from "./AddNewTaskInline.svelte";
  import { taskStore } from "./task.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import {
    removeDuplicatesFilter,
    resourceAction
  } from "../flux/resourceStores/resource.utils";
  import { ButtonVariant, ButtonStyle } from "$lib/client/types/button.type";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { generateMiniRandomId } from "$lib/shared/utils/crypto.utils";
  import { resolveMultiSelectStore } from "../flux/resourceStores/resource.store";
  import BottomFloat from "$lib/client/elements/BottomFloat.svelte";
  import BulkEditBar from "../record/BulkEditBar.svelte";
  import view from "$lib/client/stores/view.store";
  import InlineSyncingFeedback from "$lib/client/elements/feedback/InlineSyncingFeedback.svelte";
  import { fly } from "svelte/transition";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { resolveTaskDueDateFilters } from "./task.utils";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import { intersection } from "$lib/client/actions/intersection.action";
  import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
  import {
    resolveTimePeriodFilterForDay,
    resolveTimePeriodFilterForMonth
  } from "$lib/client/elements/datetime/datetime.utils";
  export let goalId: IRecordId | undefined = undefined;
  export let collectionId: IRecordId | undefined = undefined;
  export let accessPoint: ResourceAccessPoint | undefined = undefined;
  export let parentBgIndex: number = 1;
  export let isPreventAddNew: boolean = false;
  const instance = generateMiniRandomId();
  let tasks: ITaskThumb[] = [];
  let searchStore = new SearchStore(Resource.task);
  let searchQuery = "";
  let searchInputRef: InlineSearchBar | undefined;
  let isArchivedFilterSelected = false;
  let isHideCompletedFilterSelected = false;
  let isHideGoalTasksFilterSelected = false;
  let dueDateFilter: TaskDueDateFilter = TaskDueDateFilter.ALL;
  let isFiltersExpanded = false;
  let selectedSubType: SubType = "all";
  let selectedDate: Date = new Date();
  let viewDate: Date = new Date();
  let taskRecordsRef: TaskRecords | undefined;
  let dateSelectionPopoverRef: HTMLDivElement;
  let addNewTaskInlineRef: AddNewTaskInline | undefined;
  let isRefreshing = false;

  $: multiSelectContext = {
    resource: Resource.task,
    accessPoint: resolveAccessPoint(),
    accessPointId: resolveAccessPointId()
  };
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

  onMount(() => {
    refresh();

    const pageSub = page.subscribe(async (p) => {
      const subResourceParam = goalId
        ? p.url.searchParams.get(`${instance}-${AppSearchParam.TYPE}`)
        : p.url.searchParams.get(AppSearchParam.TYPE);
      let isRefreshNeeded = false;
      if (subResourceParam && subResourceParam !== selectedSubType) {
        selectedSubType = (subResourceParam as SubType) ?? "all";
        selectedDate = new Date();
        viewDate = new Date();
        isRefreshNeeded = true;
      }

      if (p.url.searchParams.get(AppSearchParam.ARCHIVED)) {
        isArchivedFilterSelected = true;
        isRefreshNeeded = true;
      } else if (isArchivedFilterSelected) {
        isArchivedFilterSelected = false;
        isRefreshNeeded = true;
      }
      if (isRefreshNeeded) await refresh();
    });

    return () => {
      pageSub();
    };
  });

  async function refresh(params?: {
    isPagination?: boolean;
    scrollToDate?: boolean;
  }) {
    if (!params?.isPagination) {
      isRefreshing = true;
      tasks = [];
    }
    const filters = resolveFilters();
    let result = await searchStore.select({
      filters,
      searchQuery,
      limit:
        selectedSubType !== TaskSubTypeForSwitcher.BY_MONTH &&
        selectedSubType !== TaskSubTypeForSwitcher.BY_DATE
          ? 50
          : undefined,
      offset: params?.isPagination ? tasks.length : undefined,
      isIgnoreParentInactive: goalId ? true : false
    });
    if (isValidArray(result)) {
      //TODO - for by_month case + overdue - the date filter has 2 conditions with AND operator - below is temporary fix until complex filters are implemented
      if (
        selectedSubType === TaskSubTypeForSwitcher.BY_MONTH &&
        dueDateFilter === TaskDueDateFilter.OVERDUE
      ) {
        result = result.filter((x: any) => {
          return x.date && compareDates(x.date, new Date(), "<");
        });
      }
      if (params?.isPagination)
        tasks = [...tasks, ...result].filter(removeDuplicatesFilter);
      else tasks = [...result];
    } else if (!params?.isPagination) {
      tasks = [];
    }
    isRefreshing = false;
    if (params?.scrollToDate) scrollToDate();
  }

  function resolveBaseFilters() {
    return {
      isArchived: isArchivedFilterSelected ? true : undefined,
      goalId: isHideGoalTasksFilterSelected ? false : undefined,
      isChecked:
        dueDateFilter === TaskDueDateFilter.OVERDUE ||
        isHideCompletedFilterSelected
          ? false
          : undefined
    };
  }

  function resolveFilters() {
    let filters: any = resolveBaseFilters();
    if (goalId) {
      filters = { ...filters, goalId: goalId.toString() };
    }
    let dateFilter: any = undefined;
    if (selectedSubType === TaskSubTypeForSwitcher.BY_DATE) {
      dateFilter = resolveTimePeriodFilterForDay(selectedDate);
    } else if (selectedSubType === TaskSubTypeForSwitcher.BY_MONTH) {
      dateFilter = resolveTimePeriodFilterForMonth(selectedDate);
    } else {
      dateFilter = resolveDateFilter();
    }
    return { ...filters, dateUnix: dateFilter };

    function resolveDateFilter() {
      if (dueDateFilter === TaskDueDateFilter.ALL) return undefined;
      else if (dueDateFilter === TaskDueDateFilter.OVERDUE) {
        const day = new Date();
        return resolveUnixTimestamp(
          new Date(day.getFullYear(), day.getMonth(), day.getDate())
        );
      } else if (dueDateFilter === TaskDueDateFilter.WITHOUT_DUE_DATE)
        return false;
    }
  }

  function resolveAccessPoint() {
    if (accessPoint) return accessPoint;
    if (goalId) return ResourceAccessPoint.GOAL;
    else if (collectionId) return ResourceAccessPoint.COLLECTION;
    return ResourceAccessPoint.LIBRARY;
  }

  function hidePopover() {
    dateSelectionPopoverRef?.dispatchEvent(new CustomEvent("hide"));
  }

  async function onAdd(e: any) {
    const label = e.detail;
    if (!label) return;
    const task = await taskStore.save({
      label,
      dateUnix: resolveUnixTimestamp(resolveDateForNewTask()),
      isChecked: false,
      goalId: goalId,
      collection: collectionId
    });
    if (isValidArrayWithData(task)) {
      tasks = [...tasks, task[0]];
      toasts.success("Task created successfully.");
      addNewTaskInlineRef?.reset();
    } else {
      toasts.error("Failed to add task. Please try again.");
    }

    function resolveDateForNewTask() {
      if (selectedSubType === TaskSubTypeForSwitcher.BY_DATE)
        return selectedDate;
      else if (selectedSubType === TaskSubTypeForSwitcher.BY_MONTH)
        return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      return undefined;
    }
  }

  function onResourceMutation(e: any) {
    console.log("onResourceMutation  - task library", e);
    refresh();
  }

  function onSelectAll() {
    $multiSelectStore = tasks.map((x) => x.id);
  }

  async function onBulkAction(e: CustomEvent<string>) {
    try {
      const editor = new BulkEditor(Resource.task, multiSelectStore);
      await editor.run(e.detail);
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }

  function resolveAccessPointId() {
    if (goalId) return goalId.toString();
    else if (collectionId) return collectionId.toString();
    return undefined;
  }

  function scrollToDate() {
    try {
      setTimeout(() => {
        if (taskRecordsRef) taskRecordsRef.scrollToDate(selectedDate);
      }, 100);
    } catch (e) {
      console.error("Failed to scroll to date", e);
    }
  }
</script>

<div
  class={cn("flex flex-col w-full h-full gap-4", {
    "p-4":
      accessPoint === ResourceAccessPoint.LIBRARY ||
      accessPoint === ResourceAccessPoint.BROWSER
  })}
>
  <LibrarySubTypeSwitcher
    resource={Resource.task}
    accessPoint={resolveAccessPoint()}
    subContext={goalId ? instance : undefined}
  >
    <Toggle
      bind:on={isFiltersExpanded}
      icon="ph:sliders-light"
      tooltip="Filters and options"
    />
  </LibrarySubTypeSwitcher>

  {#if isFiltersExpanded}
    <div
      class="flex flex-col gap-4 bg-bgs2 rounded-md p-4 mx-4"
      in:fly={{ y: -20, duration: 300 }}
    >
      {#if selectedSubType !== TaskSubTypeForSwitcher.BY_DATE}
        <OptionSelector
          options={resolveTaskDueDateFilters({
            isDatedContext: selectedSubType === TaskSubTypeForSwitcher.BY_MONTH
          })}
          labelProps={{ label: "Due date" }}
          selected={dueDateFilter}
          size={Size.sm}
          style={OptionSelectorStyle.TRAIN}
          on:select={(e) => {
            if (!e?.detail) return;
            dueDateFilter = e.detail;
            refresh();
          }}
        />
      {/if}
      <SwitchInput
        bind:checked={isHideCompletedFilterSelected}
        isExpanded={true}
        label={{ label: "Hide completed tasks" }}
        on:change={() => refresh()}
      />
      {#if !goalId}
        <SwitchInput
          bind:checked={isHideGoalTasksFilterSelected}
          isExpanded={true}
          label={{ label: "Hide tasks with a goal" }}
          on:change={() => refresh()}
        />
      {/if}
    </div>
  {/if}

  {#if selectedSubType === TaskSubTypeForSwitcher.BY_DATE || selectedSubType === TaskSubTypeForSwitcher.BY_MONTH}
    <div class="flex flex-col gap-6 border border-brs2 rounded-md p-4">
      <div class="flex justify-center w-full gap-2 px-2">
        <div
          class="text-h3 w-fit flex items-center gap-2 text-aps1 font-medium"
          bind:this={dateSelectionPopoverRef}
          use:popover={{
            content: AbsoluteTimeRangePopoverV2,
            placement: Placement.BottomCenter,
            id: "date-picker-popover",
            isRenderAsModalForCW: true,
            componentProps: {
              isDatePickerMode: true,
              selectedDate: selectedDate,
              onDateChange: (val) => {
                selectedDate = val;
                viewDate = selectedDate;
                refresh({ scrollToDate: true });
                hidePopover();
              }
            }
          }}
        >
          <!-- <Icon icon="ph:calendar" /> -->
          {selectedSubType === TaskSubTypeForSwitcher.BY_DATE &&
          isSameDay(viewDate, selectedDate)
            ? formatDate(viewDate)
            : selectedSubType === TaskSubTypeForSwitcher.BY_DATE ||
                (selectedSubType === TaskSubTypeForSwitcher.BY_MONTH &&
                  isSameDay(viewDate, selectedDate))
              ? formatDate(viewDate, "mmm-yyyy")
              : formatDate(viewDate, "yyyy")}
        </div>
      </div>
      <DatePickerRow
        isDateMode={selectedSubType === TaskSubTypeForSwitcher.BY_DATE}
        date={selectedDate}
        on:pageChange={(e) => {
          console.log({ e });
          viewDate = e.detail.viewDate;
        }}
        on:change={(e) => {
          selectedDate = e.detail;
          viewDate = selectedDate;
          refresh({ scrollToDate: true });
        }}
      />
    </div>
  {/if}
  <InlineSearchBar
    bind:this={searchInputRef}
    bind:query={searchQuery}
    on:search={() => refresh()}
    padding={cn({
      "px-4":
        !$view.isConstrainedWidth &&
        (accessPoint === ResourceAccessPoint.LIBRARY ||
          accessPoint === ResourceAccessPoint.BROWSER)
    })}
    placeholder={"Search tasks"}
    style={InputStyle.FILLED}
  >
    {#if !isPreventAddNew}
      <Button
        icon="ph:plus-light"
        type={ButtonVariant.PRIMARY}
        style={$view.isConstrainedWidth ? ButtonStyle.OUTLINED : undefined}
        size={Size.md}
        label={!$view.isConstrainedWidth ? "Create" : undefined}
        isPreventMinWidth={true}
        on:click={() => {
          appStore.runAction(
            resourceAction(Resource.task, ResourceActionType.CREATE),
            {
              componentParams: {
                date:
                  selectedSubType === TaskSubTypeForSwitcher.BY_DATE ||
                  selectedSubType === TaskSubTypeForSwitcher.BY_MONTH
                    ? selectedDate
                    : undefined,
                goalId: goalId,
                collectionId: collectionId
              }
            }
          );
        }}
      />
    {/if}
  </InlineSearchBar>
  <div class="cw:px-0 px-4 w-full">
    <InlineSyncingFeedback resource={Resource.task} isFullWidthVariant={true} />
  </div>

  {#if tasks && tasks.length > 0}
    <div
      class={cn(
        "flex flex-col gap-4 overflow-auto grow userdata ph-no-capture",
        {
          "px-4": accessPoint === ResourceAccessPoint.LIBRARY
        }
      )}
    >
      <!-- {#if selectedSubType !== TaskSubTypeForSwitcher.BY_MONTH}
      <AddNewTaskInline on:add={onAdd} bind:this={addNewTaskInlineRef} />
    {/if} -->
      <TaskRecords
        bind:this={taskRecordsRef}
        data={tasks}
        accessPoint={resolveAccessPoint()}
        accessPointId={resolveAccessPointId()}
        {parentBgIndex}
        subType={selectedSubType}
      />
      <div
        use:intersection={{
          rootMargin: "100px",
          callback: () => {
            refresh({ isPagination: true });
          }
        }}
      />
      <ScrollViewBottomSpacer />
    </div>
  {:else}
    <EmptyStatusView
      isSearchContext={searchQuery !== ""}
      isLoadingState={isRefreshing}
      loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
      mainText="No tasks found"
      subText={searchQuery !== ""
        ? "Try different search criteria or create a new task."
        : !isPreventAddNew
          ? "Create a task to get started."
          : "You can't add tasks to this goal when it is archived/deleted."}
      actionText={!isPreventAddNew ? "Create new task" : undefined}
      on:click={() => {
        appStore.runAction(
          resourceAction(Resource.task, ResourceActionType.CREATE)
        );
      }}
    />
  {/if}
</div>
{#if $multiSelectStore.length > 0}
  <BottomFloat zIndex="z-30">
    <BulkEditBar
      isConstrainedWidth={$view.isConstrainedWidth ||
        accessPoint === ResourceAccessPoint.BROWSER}
      context={multiSelectContext}
      subContext={selectedSubType +
        (isArchivedFilterSelected ? "archived" : "")}
      on:selectAll={onSelectAll}
      on:action={onBulkAction}
    />
  </BottomFloat>
{/if}
<ComponentBaseLayer
  syncDownOnMount={true}
  subscribeToResource={new Set([Resource.task])}
  subscribeToContext={new Set([
    resolveAccessPoint(),
    resourceAction(Resource.task, ResourceActionType.CREATE)
  ])}
  isSubscribeToRemovalPropertiesOnly={true}
  on:syncDown={() => {
    refresh();
  }}
  on:change={onResourceMutation}
/>
