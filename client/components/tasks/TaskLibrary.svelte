<script lang="ts">
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { onDestroy, onMount } from "svelte";
  import { BulkEditor, SearchStore } from "@21n/components/record/record.store";
  import {
    TaskDueDateFilter,
    TaskSubTypeForSwitcher,
    type ITaskThumb
  } from "@21n/components/tasks/task.type";
  import {
    isValidArray,
    isValidArrayWithData
  } from "@21n/shared-utils/obj.utils";
  import TaskRecords from "@21n/components/tasks/TaskRecords.svelte";
  import {
    IResourceFilterDateGrouping,
    RemovalProperty,
    type IRecordId
  } from "@21n/types/data.type";
  import InlineSearchBar from "@21n/elements/InlineSearchBar.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { page } from "$app/stores";
  import type { SubType } from "@21n/components/library/library.type";
  import LibrarySubTypeSwitcher from "@21n/components/library/LibrarySubTypeSwitcher.svelte";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import Toggle from "@21n/elements/toggle/Toggle.svelte";
  import { Size } from "@21n/types/size.enum";
  import DatePickerRow from "@21n/elements/datetime/DatePickerRow.svelte";
  import AbsoluteTimeRangePopoverV2 from "@21n/elements/datetime/absolute/AbsoluteTimeRangePopoverV2.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import { popover } from "@21n/actions/popover.action";
  import {
    compareDates,
    parseAndFormatDate,
    isSameDay
  } from "@21n/utils/time.utils";
  import { taskStore } from "@21n/components/tasks/task.store";
  import { toasts } from "@21n/stores/notification.store";
  import Button from "@21n/elements/button/Button.svelte";
  import { appStore } from "@21n/stores/app.store";
  import {
    removeDuplicatesFilter,
    resourceAction
  } from "@21n/components/flux/resourceStores/resource.utils";
  import { ButtonVariant, ButtonStyle } from "@21n/types/button.type";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { generateMiniRandomId } from "@21n/shared-utils/crypto.utils";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import view from "@21n/stores/view.store";
  import InlineSyncingFeedback from "@21n/elements/feedback/InlineSyncingFeedback.svelte";
  import { fly } from "svelte/transition";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import { resolveTaskDueDateFilters } from "@21n/components/tasks/task.utils";
  import { OptionSelectorStyle } from "@21n/types/select.type";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { intersection } from "@21n/actions/intersection.action";
  import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { dragSelection } from "@21n/actions/dragSelection.action";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { logger } from "@21n/components/debug/logger.client";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
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
  let isHideGoalTasksFilterSelected = false;
  let dueDateFilter: TaskDueDateFilter = TaskDueDateFilter.ALL;
  let isFiltersExpanded = false;
  let selectedSubType: SubType = "all";
  let selectedDate: Date = new Date();
  let viewDate: Date = new Date();
  let taskRecordsRef: TaskRecords | undefined;
  let dateSelectionPopoverRef: HTMLButtonElement | undefined;
  let isRefreshing = false;
  let isInSelectionMode = false;
  let isShowSearchBar = false;
  let bulkEditChangeUnsub: (() => void) | undefined;
  $: multiSelectContext = {
    resource: Resource.task,
    accessPoint: resolveAccessPoint(),
    accessPointId: resolveAccessPointId()
  };

  function resolveBulkEditSubContext() {
    return selectedSubType + (isArchivedFilterSelected ? "archived" : "");
  }

  function resolveBulkEditorInstance() {
    bulkEditStore.activate(multiSelectContext, {
      onAction: onBulkAction,
      onSelectAll: onSelectAll,
      subContext: resolveBulkEditSubContext()
    });
  }

  $: if (bulkEditStore.matchesContext(multiSelectContext)) {
    resolveBulkEditorInstance();
  }

  function resolveFiltersExpandedState() {
    return (
      uiState.getState(UIState.taskLibraryFiltersExpanded, {
        scope: UIStateScope.DAP
      }) ?? false
    );
  }

  function resolveSelectedSubTypeState() {
    return (
      uiState.getState(UIState.taskLibrarySelectedSubType, {
        scope: UIStateScope.DAP
      }) ?? "all"
    );
  }

  function persistFiltersExpandedState() {
    uiState.setState(UIState.taskLibraryFiltersExpanded, isFiltersExpanded, {
      scope: UIStateScope.DAP
    });
  }

  function persistSelectedSubTypeState() {
    uiState.setState(UIState.taskLibrarySelectedSubType, selectedSubType, {
      scope: UIStateScope.DAP
    });
  }

  onMount(() => {
    isFiltersExpanded = resolveFiltersExpandedState();
    selectedSubType = resolveSelectedSubTypeState();

    refresh();

    bulkEditChangeUnsub = bulkEditStore.count.subscribe((count) => {
      if (count === 0) {
        isInSelectionMode = false;
      }
    });

    const pageSub = page.subscribe(async (p) => {
      const subResourceParam = goalId
        ? p.url.searchParams.get(`${instance}-${AppSearchParam.TYPE}`)
        : p.url.searchParams.get(AppSearchParam.TYPE);
      let isRefreshNeeded = false;
      if (subResourceParam && subResourceParam !== selectedSubType) {
        selectedSubType = (subResourceParam as SubType) ?? "all";
        persistSelectedSubTypeState();
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

  onDestroy(() => {
    if (bulkEditChangeUnsub) bulkEditChangeUnsub();
    if (bulkEditStore.matchesContext(multiSelectContext)) {
      bulkEditStore.clear();
    }
  });

  async function refresh(params?: {
    isPagination?: boolean;
    scrollToDate?: boolean;
  }) {
    try {
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
        if (dueDateFilter === TaskDueDateFilter.OVERDUE) {
          result = result.filter((x: any) => {
            return (
              x.dateUnix && compareDates(new Date(x.dateUnix), new Date(), "<")
            );
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
    } catch (e) {
      isRefreshing = false;
      logger.error({ at: "TaskLibrary - refresh", e });
      toasts.error("Failed to refresh tasks. Please try again.");
    }
  }

  function resolveBaseFilters() {
    return {
      isArchived: isArchivedFilterSelected ? true : undefined,
      goalId: isHideGoalTasksFilterSelected ? false : undefined,
      isChecked: dueDateFilter === TaskDueDateFilter.OVERDUE ? false : undefined
    };
  }

  function resolveFilters() {
    let filters: any = resolveBaseFilters();
    if (goalId) {
      filters = { ...filters, goalId: goalId.toString() };
    }
    let dateFilter: any = undefined;
    if (selectedSubType === TaskSubTypeForSwitcher.BY_DATE) {
      dateFilter = tzStore.resolveTimePeriodFilterForDay(selectedDate);
    } else if (selectedSubType === TaskSubTypeForSwitcher.BY_MONTH) {
      dateFilter = tzStore.resolveTimePeriodFilterForMonth(selectedDate);
    } else {
      dateFilter = resolveDateFilter();
    }
    return { ...filters, dateUnix: dateFilter };

    function resolveDateFilter() {
      if (dueDateFilter === TaskDueDateFilter.ALL) return undefined;
      else if (dueDateFilter === TaskDueDateFilter.OVERDUE) {
        const dayFilter = tzStore.resolveTimePeriodFilterForDay(new Date());
        return {
          lessThanOrEqual: dayFilter.greaterThanOrEqual
        };
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

  function onDateSelectionChange(val: Date) {
    selectedDate = val;
    viewDate = selectedDate;
    refresh({ scrollToDate: true });
    hidePopover();
  }

  async function onAdd(e: any) {
    const label = e.detail;
    if (!label) return;
    const createdTasks =
      (await taskStore.save({
        label,
        dateUnix: resolveUnixTimestamp(resolveDateForNewTask()),
        goalId,
        collectionId
      })) ?? [];
    if (isValidArrayWithData(createdTasks)) {
      const createdTask = createdTasks[0];
      if (!createdTask) {
        toasts.error("Failed to add task. Please try again.");
        return;
      }
      tasks = [...tasks, createdTask];
      toasts.success("Task created successfully.");
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
    return tasks.map((x) => x.id);
  }

  async function onBulkAction(
    ids: IRecordId[],
    action: string,
    data?: unknown
  ) {
    try {
      const editor = new BulkEditor(Resource.task, bulkEditStore);
      await editor.run(action, data);
      refresh();
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
    "p-4": accessPoint === ResourceAccessPoint.LIBRARY,
    "px-4": accessPoint === ResourceAccessPoint.BROWSER
  })}
  id="task-library"
  use:dragSelection={{
    selectableSelector: "div[id^='thumbnail-']",
    containerId: "task-library",
    onSelectionChange: (elements, ids) => {
      resolveBulkEditorInstance();
      if (!ids || ids.length === 0) {
        bulkEditStore.reset();
        isInSelectionMode = false;
        return;
      }
      const state = bulkEditStore.getState();
      if (isInSelectionMode) {
        bulkEditStore.select([...new Set([...state.selectedIds, ...ids])]);
      } else {
        isInSelectionMode = true;
        bulkEditStore.select(ids);
      }
      isInSelectionMode = bulkEditStore.getState().selectedIds.length > 0;
    }
  }}
>
  <LibrarySubTypeSwitcher
    resource={Resource.task}
    accessPoint={resolveAccessPoint()}
    {selectedSubType}
    subContext={goalId ? instance : undefined}
  >
    <Toggle bind:on={isShowSearchBar} icon="search" tooltip="Search" />
    {#if selectedSubType !== TaskSubTypeForSwitcher.BY_DATE || !goalId}
      <Toggle
        bind:on={isFiltersExpanded}
        icon="ph:sliders-light"
        tooltip="Filters and options"
        on:change={() => persistFiltersExpandedState()}
      />
    {/if}
    {#if !isPreventAddNew && ((!$view.isConstrainedWidth && accessPoint === ResourceAccessPoint.LIBRARY) || accessPoint === ResourceAccessPoint.GOAL)}
      <Button
        icon="plus"
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        size={Size.md}
        isPreventMinWidth={true}
        on:click={() => {
          appStore.runAction(PointronAction.CREATE_TASK_INLINE, {
            componentParams: {
              date:
                selectedSubType === TaskSubTypeForSwitcher.BY_DATE ||
                selectedSubType === TaskSubTypeForSwitcher.BY_MONTH
                  ? selectedDate
                  : undefined,
              goalId: goalId,
              collectionId: collectionId
            }
          });
        }}
      />
    {/if}
  </LibrarySubTypeSwitcher>

  {#if isFiltersExpanded}
    <div
      class={cn("flex flex-col gap-4 bg-bgs2 rounded-md p-4", {
        "cw:mx-0 mx-4": accessPoint === ResourceAccessPoint.LIBRARY
      })}
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
    <div
      class={cn("flex border border-brs2 rounded-md", {
        "mx-4": accessPoint === ResourceAccessPoint.LIBRARY
      })}
    >
      <button
        class="w-32 flex items-center justify-center gap-2 text-b2 text-fgs2 font-medium tabular-nums h-full whitespace-nowrap cw:py-1 py-2 cw:px-2 px-4 rounded-l-md bg-bgs2 hover:bg-bgs3-striped border-r border-brs2"
        bind:this={dateSelectionPopoverRef}
        use:popover={{
          content: AbsoluteTimeRangePopoverV2,
          placement: Placement.BottomCenter,
          id: "date-picker-popover",
          isRenderAsModalForCW: true,
          componentProps: {
            isDatePickerMode: true,
            selectedDate: selectedDate,
            onDateChange: onDateSelectionChange
          }
        }}
      >
        <!-- <Icon icon="ph:calendar" /> -->
        {selectedSubType === TaskSubTypeForSwitcher.BY_DATE &&
        isSameDay(viewDate, selectedDate)
          ? parseAndFormatDate(viewDate)
          : selectedSubType === TaskSubTypeForSwitcher.BY_DATE ||
              (selectedSubType === TaskSubTypeForSwitcher.BY_MONTH &&
                isSameDay(viewDate, selectedDate))
            ? parseAndFormatDate(viewDate, "mmm-yyyy")
            : parseAndFormatDate(viewDate, "yyyy")}
      </button>
      <div class="flex-grow h-full">
        <DatePickerRow
          isDateMode={selectedSubType === TaskSubTypeForSwitcher.BY_DATE}
          date={selectedDate}
          on:pageChange={(e) => {
            viewDate = e.detail.viewDate;
          }}
          on:change={(e) => {
            selectedDate = e.detail;
            viewDate = selectedDate;
            refresh({ scrollToDate: true });
          }}
        />
      </div>
    </div>
  {/if}
  {#if isShowSearchBar}
    <div class="flex gap-2 items-center" in:fly={{ y: -20, duration: 300 }}>
      <InlineSearchBar
        bind:this={searchInputRef}
        bind:query={searchQuery}
        on:search={() => refresh()}
        padding={cn({
          "pl-4":
            !$view.isConstrainedWidth &&
            accessPoint === ResourceAccessPoint.LIBRARY
        })}
        placeholder={"Search tasks"}
        testId="search-tasks"
        style={InputStyle.BORDERED}
      />
    </div>
  {/if}

  <InlineSyncingFeedback
    resource={Resource.task}
    padding="cw:px-0 px-4"
    isDisableOutTransition={true}
  />

  <div
    class={cn(
      "flex flex-col gap-4 pr-1.5 overflow-auto-scrollbar grow userdata",
      {
        "px-4": accessPoint === ResourceAccessPoint.LIBRARY
      }
    )}
  >
    <TaskRecords
      bind:this={taskRecordsRef}
      data={tasks}
      accessPoint={resolveAccessPoint()}
      accessPointId={resolveAccessPointId()}
      {parentBgIndex}
      subType={selectedSubType}
      {isRefreshing}
      {searchQuery}
      on:create={() => {
        appStore.runAction(PointronAction.CREATE_TASK_INLINE, {
          componentParams: {
            date:
              selectedSubType === TaskSubTypeForSwitcher.BY_DATE ||
              selectedSubType === TaskSubTypeForSwitcher.BY_MONTH
                ? selectedDate
                : undefined,
            goalId: goalId,
            collectionId: collectionId
          }
        });
      }}
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
</div>
<ComponentBaseLayer
  syncDownOnMount={true}
  subscribeToResource={new Set([Resource.task])}
  subscriptionPropsForMergeAction={[
    RemovalProperty.IS_ARCHIVED,
    RemovalProperty.TRASH_INFORMATION,
    "dateUnix"
  ]}
  on:syncDown={() => {
    refresh();
  }}
  on:change={onResourceMutation}
/>
