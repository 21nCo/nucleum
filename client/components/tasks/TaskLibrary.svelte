<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "$lib/client/components/flux/resourceStores/resource.type";
  import { onMount } from "svelte";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
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
  import Icon from "$lib/client/elements/Icon.svelte";
  import { formatDate, isSameDay } from "$lib/client/utils/time.utils";
  import AddNewTaskInline from "./AddNewTaskInline.svelte";
  import { taskStore } from "./task.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { Action } from "$lib/client/types/action.enum";
  import { resourceAction } from "../flux/resourceStores/resource.utils";

  export let goalId: IRecordId | undefined = undefined;
  export let collectionId: IRecordId | undefined = undefined;
  export let accessPoint: ResourceAccessPoint | undefined = undefined;
  export let parentBgIndex: number = 1;
  let tasks: ITaskThumb[] = [];
  let searchStore = new SearchStore(Resource.task);
  let searchQuery = "";
  let searchInputRef: InlineSearchBar | undefined;
  let isArchivedFilterSelected = false;
  let isHideCompletedFilterSelected = false;
  let selectedSubType: SubType = "all";
  let selectedDate: Date = new Date();
  let viewDate: Date = new Date();
  let taskRecordsRef: TaskRecords | undefined;
  let dateSelectionPopoverRef: HTMLDivElement;
  let addNewTaskInlineRef: AddNewTaskInline | undefined;
  onMount(() => {
    refresh();

    const pageSub = page.subscribe(async (p) => {
      const subResourceParam = p.url.searchParams.get("type");
      let isRefreshNeeded = false;
      if (subResourceParam && subResourceParam !== selectedSubType) {
        selectedSubType = (subResourceParam as SubType) ?? "all";
        selectedDate = new Date();
        viewDate = new Date();
        isRefreshNeeded = true;
      }

      if (p.url.searchParams.get("archived")) {
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

  async function refresh() {
    const filters = resolveFilters();
    const result = await searchStore.select({
      filters,
      searchQuery
    });
    if (isValidArray(result)) {
      tasks = [...result];
    } else {
      tasks = [];
    }
  }

  function resolveBaseFilters() {
    return {
      isChecked: isHideCompletedFilterSelected ? false : undefined,
      isArchived: isArchivedFilterSelected ? true : undefined
    };
  }

  function resolveFilters() {
    let filters: any = resolveBaseFilters();
    if (goalId) {
      filters = { ...filters, goal: goalId.toString() };
    }
    if (selectedSubType === "without-due-date") {
      filters = { ...filters, date: false };
    } else if (selectedSubType === "bydate") {
      filters = { ...filters, date: selectedDate };
    } else if (selectedSubType === "bymonth") {
      filters = {
        ...filters,
        date: {
          type: "date",
          groupBy: IResourceFilterDateGrouping.MONTH,
          equals: selectedDate
        }
      };
    }
    return filters;
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
      date: resolveDateForNewTask(),
      isChecked: false,
      goal: goalId,
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
      if (selectedSubType === "bydate") return selectedDate;
      else if (selectedSubType === "bymonth")
        return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      return undefined;
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
  >
    <Toggle
      bind:on={isHideCompletedFilterSelected}
      icon="ph:eye-slash-light"
      tooltip="Hide completed tasks"
      bgSize={Size.sm}
      on:change={() => refresh()}
    />
  </LibrarySubTypeSwitcher>

  {#if selectedSubType === "bydate" || selectedSubType === "bymonth"}
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
                taskRecordsRef?.scrollToDate(selectedDate);
                refresh();
                hidePopover();
              }
            }
          }}
        >
          <!-- <Icon icon="ph:calendar" /> -->
          {selectedSubType === "bydate" && isSameDay(viewDate, selectedDate)
            ? formatDate(viewDate)
            : selectedSubType === "bydate" ||
                (selectedSubType === "bymonth" &&
                  isSameDay(viewDate, selectedDate))
              ? formatDate(viewDate, "mmm-yyyy")
              : formatDate(viewDate, "yyyy")}
        </div>
      </div>
      <DatePickerRow
        isDateMode={selectedSubType === "bydate"}
        date={selectedDate}
        on:pageChange={(e) => {
          console.log({ e });
          viewDate = e.detail.viewDate;
        }}
        on:change={(e) => {
          selectedDate = e.detail;
          viewDate = selectedDate;
          refresh();
          taskRecordsRef?.scrollToDate(selectedDate);
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
        accessPoint === ResourceAccessPoint.LIBRARY ||
        accessPoint === ResourceAccessPoint.BROWSER
    })}
    placeholder={"Search tasks"}
    style={InputStyle.FILLED}
  >
    <Button
      icon="ph:plus-light"
      on:click={() => {
        appStore.runAction(
          resourceAction(Resource.task, ResourceActionType.CREATE),
          {
            componentParams: {
              date: selectedDate,
              goalId: goalId,
              collectionId: collectionId
            }
          }
        );
      }}
    />
  </InlineSearchBar>
  <div
    class={cn("flex flex-col gap-4 overflow-auto grow", {
      "px-4": accessPoint === ResourceAccessPoint.LIBRARY
    })}
  >
    <!-- {#if selectedSubType !== "bymonth"}
      <AddNewTaskInline on:add={onAdd} bind:this={addNewTaskInlineRef} />
    {/if} -->
    <TaskRecords
      bind:this={taskRecordsRef}
      data={tasks}
      accessPoint={resolveAccessPoint()}
      accessPointId={goalId ?? collectionId}
      {parentBgIndex}
    />
    <ScrollViewBottomSpacer />
  </div>
</div>
