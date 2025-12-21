<script lang="ts">
  import { Arrangement } from "@21n/types/direction.enum";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import {
    TaskSubTypeForSwitcher,
    type ITaskThumb
  } from "@21n/components/tasks/task.type";
  import { parseAndFormatDate } from "@21n/utils/time.utils";
  import { Size } from "@21n/types/size.enum";
  import type { IRecordId } from "@21n/types/data.type";
  import Button from "@21n/elements/button/Button.svelte";
  import type { SubType } from "@21n/components/library/library.type";
  import { appEvents } from "@21n/stores/notification.store";
  import { onMount } from "svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import CreateTaskInlineWizard from "./CreateTaskInlineWizard.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { createEventDispatcher } from "svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import view from "@21n/stores/view.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import ComponentShortcutListener from "../shortcuts/ComponentShortcutListener.svelte";
  import { Action } from "@21n/types/action.enum";
  import TasksGroupedByGoal from "./TasksGroupedByGoal.svelte";
  const dispatch = createEventDispatcher();

  export let data: ITaskThumb[];
  export let arrangement: Arrangement = Arrangement.LIST;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.LIBRARY;
  export let accessPointId: IRecordId | undefined = undefined;
  export let parentBgIndex = 1;
  export let subType: SubType | undefined = undefined;
  export let isRefreshing: boolean = false;
  export let searchQuery: string = "";
  export let isPreventAddNew: boolean = false;
  export let date: Date | undefined = undefined;
  let isShowCreateTaskWizard: boolean = false;
  let createTaskParams: any | undefined = undefined;
  let completedTasksCount: number = 0;
  let isShowCompletedTasks: boolean = refreshShowCompletedTasksState();
  const inboxZeroIllustrations = ["inboxZero", "travel", "check", "globe"];
  $: _data = applyFilters(data, { isShowCompletedTasks });

  $: tasksByDate =
    subType === TaskSubTypeForSwitcher.BY_MONTH
      ? groupTasksByDate(_data)
      : null;

  $: completedTasksCount = data.filter(
    (task: ITaskThumb) => task.isChecked
  ).length;

  onMount(() => {
    const appEventSub = appEvents.subscribe((x) => {
      if (x.event === PointronAction.CREATE_TASK_INLINE) {
        isShowCreateTaskWizard = !isShowCreateTaskWizard;
        createTaskParams = x.value;
      }
    });

    return () => {
      appEventSub();
    };
  });

  function refreshShowCompletedTasksState() {
    return (
      uiState.getState(UIState.showCompletedTasks, {
        scope: UIStateScope.DEVICE
      }) ?? false
    );
  }

  function applyFilters(
    tasks: ITaskThumb[],
    filters: { isShowCompletedTasks?: boolean }
  ) {
    if (filters.isShowCompletedTasks === false) {
      return tasks.filter((task: ITaskThumb) => !task.isChecked);
    }
    return tasks;
  }

  export function scrollToDate(date: Date) {
    const dateKey = parseAndFormatDate(date);
    let dateElement = document.querySelector(
      `[data-date="${dateKey}"]`
    ) as HTMLDivElement;

    if (!dateElement && tasksByDate && tasksByDate.length > 0) {
      const targetTime = date.getTime();
      let closestDate: string | null = null;
      let minDiff = Infinity;

      tasksByDate.forEach(([dateStr]) => {
        if (dateStr === "No Date") return;

        const currentDate = new Date(dateStr);
        const diff = Math.abs(currentDate.getTime() - targetTime);

        if (diff < minDiff) {
          minDiff = diff;
          closestDate = dateStr;
        }
      });

      if (closestDate) {
        dateElement = document.querySelector(
          `[data-date="${parseAndFormatDate(new Date(closestDate))}"]`
        ) as HTMLDivElement;
      }
    }

    dateElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function groupTasksByDate(tasks: ITaskThumb[]) {
    const groups = new Map<string, ITaskThumb[]>();

    tasks.forEach((task) => {
      const dateKey = task.dateUnix
        ? parseAndFormatDate(new Date(task.dateUnix))!
        : "No Date";
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(task);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "No Date") return 1;
      if (b[0] === "No Date") return -1;
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });
  }

  function toggleCompletedTasks() {
    isShowCompletedTasks = !isShowCompletedTasks;
    uiState.setState(UIState.showCompletedTasks, isShowCompletedTasks, {
      scope: UIStateScope.DEVICE
    });
    //TODO - reapply filters
  }

  function handleCreateTask() {
    dispatch("create");
  }
</script>

<div class="flex flex-col gap-2 w-full h-full">
  {#if isShowCreateTaskWizard}
    <div class="flex w-full mb-2">
      <CreateTaskInlineWizard
        {...createTaskParams ?? {}}
        on:close={() => (isShowCreateTaskWizard = false)}
      />
    </div>
  {/if}
  {#if _data && _data.length > 0 && !isRefreshing}
    {#if subType === TaskSubTypeForSwitcher.BY_MONTH && tasksByDate}
      <div class="flex flex-col gap-12">
        {#each tasksByDate as [date, tasks]}
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <h3
                class="text-fgs3 text-h5"
                data-date={parseAndFormatDate(new Date(date))}
              >
                {date}
              </h3>
              <!-- <Button icon="plus" size={Size.sm} tooltip="Add task" /> -->
            </div>
            <TasksGroupedByGoal
              {tasks}
              date={new Date(date)}
              {accessPoint}
              {accessPointId}
              {parentBgIndex}
              {arrangement}
            />
          </div>
        {/each}
      </div>
    {:else}
      <TasksGroupedByGoal
        tasks={_data}
        {accessPoint}
        {accessPointId}
        {parentBgIndex}
        {arrangement}
        {date}
        isDisableGrouping={accessPoint === ResourceAccessPoint.GOAL ||
          accessPoint === ResourceAccessPoint.LIBRARY ||
          accessPoint === ResourceAccessPoint.BROWSER}
      />
    {/if}
  {:else}
    <EmptyStatusView
      isLoadingState={isRefreshing}
      isSearchContext={searchQuery !== ""}
      size={accessPoint === ResourceAccessPoint.CALENDAR ? Size.sm : Size.md}
      loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
      mainText={completedTasksCount > 0 ? "Inbox zero" : "No tasks found"}
      subText={searchQuery !== ""
        ? "Try different search criteria or create a new task."
        : completedTasksCount > 0
          ? `You completed ${completedTasksCount > 1 ? "all your" : "your"} ${completedTasksCount} task${completedTasksCount > 1 ? "s" : ""}!`
          : isPreventAddNew
            ? "You can't add tasks to this goal when it is archived/deleted."
            : "Choose a different filters or create a task"}
      actionText={accessPoint !== ResourceAccessPoint.CALENDAR &&
      !isPreventAddNew &&
      !$view.isConstrainedWidth
        ? "Create task"
        : undefined}
      actionShortcut={Action.CREATE}
      on:click={handleCreateTask}
      emptyIllustration={accessPoint === ResourceAccessPoint.CALENDAR &&
      completedTasksCount > 0
        ? inboxZeroIllustrations[Math.floor(Math.random() * 4)]
        : undefined}
    >
      {#if completedTasksCount > 0}
        <div class="my-4">
          <Button
            icon={isShowCompletedTasks ? "hide" : ""}
            label={isShowCompletedTasks
              ? "Hide completed"
              : `Completed (${completedTasksCount})`}
            size={Size.sm}
            type={ButtonVariant.SECONDARY}
            style={ButtonStyle.PLAIN}
            on:click={toggleCompletedTasks}
          />
        </div>
      {/if}
    </EmptyStatusView>
  {/if}
  {#if !isRefreshing && _data.length > 0}
    <div class="flex flex-col justify-center items-center gap-6">
      {#if completedTasksCount > 0}
        <Button
          icon={isShowCompletedTasks ? "hide" : ""}
          label={isShowCompletedTasks
            ? "Hide completed"
            : `Completed (${completedTasksCount})`}
          size={Size.sm}
          type={ButtonVariant.SECONDARY}
          style={ButtonStyle.PLAIN}
          on:click={toggleCompletedTasks}
        />
      {/if}
      {#if accessPoint === ResourceAccessPoint.PICKER}
        <Button
          icon="plus"
          label="New task"
          size={Size.sm}
          shortcut={Action.CREATE}
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          on:click={handleCreateTask}
        />
      {/if}
    </div>
  {/if}
</div>
<ComponentShortcutListener
  shortcuts={[
    {
      shortcut: Action.CREATE,
      callback: handleCreateTask
    }
  ]}
/>
