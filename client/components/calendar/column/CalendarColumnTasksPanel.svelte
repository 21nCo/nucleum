<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import TaskRecords from "@21n/components/tasks/TaskRecords.svelte";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { BulkEditor, SearchStore } from "@21n/components/record/record.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { appStore } from "@21n/stores/app.store";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { RemovalProperty, type IRecordId } from "@21n/types/data.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { shortcutsConfig } from "@21n/components/shortcuts/shortcuts.config";
  import ComponentShortcutListener from "@21n/components/shortcuts/ComponentShortcutListener.svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState, UIStateScope } from "@21n/stores/uiState/uiState.type";
  import { toasts } from "@21n/stores/notification.store";
  import { dragSelection } from "@21n/actions/dragSelection.action";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  export let date: Date;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CALENDAR;
  export let isShowCompletedTasks: boolean = refreshShowCompletedTasksState();
  export let completedTasksCount: number = 0;
  let isRefreshing = false;
  let tasks: ITaskThumb[] = [];
  let isInSelectionMode = false;
  onMount(async () => {
    await refreshTimeline();
  });
  const inboxZeroIllustrations = ["inboxZero", "travel", "check", "globe"];

  function refreshShowCompletedTasksState() {
    return (
      uiState.getState(UIState.showCompletedCalendarTasks, {
        scope: UIStateScope.DEVICE
      }) ?? false
    );
  }

  $: multiSelectContext = {
    resource: Resource.task,
    accessPoint
  };

  onDestroy(() => {
    if (bulkEditStore.matchesContext(multiSelectContext)) {
      bulkEditStore.clear();
    }
  });

  async function refreshTimeline() {
    isRefreshing = true;
    await loadTasks();
    isRefreshing = false;
  }

  async function loadTasks() {
    const dateFilter = tzStore.resolveTimePeriodFilterForDay(date);
    const allTasks = await new SearchStore(Resource.task).select({
      filters: {
        dateUnix: dateFilter
      }
    });
    completedTasksCount = allTasks.filter(
      (task: ITaskThumb) => task.isChecked
    ).length;

    if (isShowCompletedTasks) {
      tasks = allTasks;
    } else {
      tasks = allTasks.filter((task: ITaskThumb) => !task.isChecked);
    }
  }

  async function handleCreateTask() {
    appStore.runAction(
      resourceAction(Resource.task, ResourceActionType.CREATE),
      {
        componentParams: { date }
      }
    );
  }

  function onResourceMutation(event: CustomEvent) {
    refreshTimeline();
  }

  export function toggleCompletedTasks() {
    isShowCompletedTasks = !isShowCompletedTasks;
    uiState.setState(UIState.showCompletedCalendarTasks, isShowCompletedTasks, {
      scope: UIStateScope.DEVICE
    });
    loadTasks();
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
      refreshTimeline();
    } catch (e) {
      toasts.error("Failed to perform bulk action");
    }
  }
</script>

<div
  class="relative w-full h-full overflow-y-auto"
  id="calendar-tasks-panel"
  use:dragSelection={{
    selectableSelector: "div[id^='thumbnail-']",
    containerId: "calendar-tasks-panel",
    onSelectionChange: (elements, ids) => {
      bulkEditStore.activate(multiSelectContext, {
        onAction: onBulkAction,
        onSelectAll: onSelectAll,
        subContext: date.toISOString()
      });
      const state = bulkEditStore.getState();
      if (isInSelectionMode) {
        bulkEditStore.select([...new Set([...state.selectedIds, ...ids])]);
      } else {
        isInSelectionMode = true;
        bulkEditStore.select(ids);
      }
    }
  }}
>
  {#if isRefreshing || tasks.length === 0}
    <EmptyStatusView
      isLoadingState={isRefreshing}
      size={Size.sm}
      mainText={completedTasksCount > 0 ? "Inbox zero" : "No tasks found"}
      subText={completedTasksCount > 0
        ? `You completed ${completedTasksCount > 1 ? "all your" : "your"} ${completedTasksCount} task${completedTasksCount > 1 ? "s" : ""}!`
        : "Choose a different date or create a task"}
      actionText={accessPoint === ResourceAccessPoint.PICKER
        ? "Create task"
        : undefined}
      actionShortcut={shortcutsConfig.create}
      on:click={handleCreateTask}
      loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
      emptyIllustration={completedTasksCount > 0
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
  {:else}
    <div class="overflow-auto py-3">
      <TaskRecords data={tasks} {accessPoint} />
    </div>
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
          shortcut={shortcutsConfig.create}
          type={ButtonVariant.PRIMARY}
          style={ButtonStyle.OUTLINED}
          on:click={handleCreateTask}
        />
      {/if}
    </div>
    <ScrollViewBottomSpacer />
    <!-- <FloatingButton
      params={[
        {
          icon: "plus",
          label: "Create new task",
          callback: handleCreateTask
          // variant: ButtonVariant.PRIMARY,
          // style: ButtonStyle.OUTLINED
        }
      ]}
    /> -->
  {/if}
</div>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.task])}
  subscriptionPropsForMergeAction={[
    RemovalProperty.IS_ARCHIVED,
    RemovalProperty.TRASH_INFORMATION,
    "dateUnix",
    "isChecked"
  ]}
  on:syncDown={() => {
    refreshTimeline();
  }}
  on:change={onResourceMutation}
/>
{#if accessPoint === ResourceAccessPoint.PICKER}
  <ComponentShortcutListener
    shortcuts={[
      {
        shortcut: shortcutsConfig.create,
        callback: handleCreateTask
      }
    ]}
  />
{/if}
