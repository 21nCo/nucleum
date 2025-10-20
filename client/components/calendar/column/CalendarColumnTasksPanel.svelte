<script lang="ts">
  import { onMount } from "svelte";
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
  import {
    PersistenceActionType,
    RemovalProperty
  } from "@21n/types/data.type";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { Size } from "@21n/types/size.enum";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import ScrollViewBottomSpacer from "@21n/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { shortcutsConfig } from "@21n/components/shortcuts/shortcuts.config";
  import ComponentShortcutListener from "@21n/components/shortcuts/ComponentShortcutListener.svelte";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import {
    UIState,
    UIStateScope
  } from "@21n/stores/uiState/uiState.type";
  import { resolveMultiSelectStore } from "@21n/components/flux/resourceStores/resource.store";
  import BottomFloat from "@21n/elements/BottomFloat.svelte";
  import BulkEditBar from "@21n/components/record/BulkEditBar.svelte";
  import { toasts } from "@21n/stores/notification.store";
  import { dragSelection } from "@21n/actions/dragSelection.action";
  export let date: Date;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CALENDAR;
  let isRefreshing = false;
  let tasks: ITaskThumb[] = [];
  let completedTasksCount = 0;
  let showCompletedTasks = refreshShowCompletedTasksState();
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
  $: multiSelectStore = resolveMultiSelectStore(multiSelectContext);

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

    if (showCompletedTasks) {
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

  function toggleCompletedTasks() {
    showCompletedTasks = !showCompletedTasks;
    uiState.setState(UIState.showCompletedCalendarTasks, showCompletedTasks, {
      scope: UIStateScope.DEVICE
    });
    loadTasks();
  }

  function onSelectAll() {
    $multiSelectStore = tasks.map((x) => x.id);
  }

  async function onBulkAction(
    e: CustomEvent<{ action: string; data?: unknown }>
  ) {
    try {
      const editor = new BulkEditor(Resource.task, multiSelectStore);
      await editor.run(e.detail.action, e.detail.data);
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
      if (isInSelectionMode) {
        $multiSelectStore = [
          ...new Set([...($multiSelectStore ?? []), ...ids])
        ];
      } else {
        isInSelectionMode = true;
        $multiSelectStore = ids;
      }
    }
  }}
>
  {#if isRefreshing || tasks.length === 0}
    <EmptyStatusView
      isLoadingState={isRefreshing}
      mainText={completedTasksCount > 0 ? "Inbox zero" : "No tasks found"}
      subText={completedTasksCount > 0
        ? "You completed all your tasks!"
        : "Choose a different date or create a task"}
      actionText="Create task"
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
            icon={showCompletedTasks ? "hide" : ""}
            label={showCompletedTasks
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
          icon={showCompletedTasks ? "hide" : ""}
          label={showCompletedTasks
            ? "Hide completed"
            : `Completed (${completedTasksCount})`}
          size={Size.sm}
          type={ButtonVariant.SECONDARY}
          style={ButtonStyle.PLAIN}
          on:click={toggleCompletedTasks}
        />
      {/if}
      <Button
        icon="plus"
        label="New task"
        size={Size.sm}
        shortcut={shortcutsConfig.create}
        type={ButtonVariant.PRIMARY}
        style={ButtonStyle.OUTLINED}
        on:click={handleCreateTask}
      />
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
{#if $multiSelectStore.length > 0}
  <BottomFloat zIndex="z-30">
    <BulkEditBar
      context={multiSelectContext}
      subContext={date.toISOString()}
      on:selectAll={onSelectAll}
      on:action={onBulkAction}
    />
  </BottomFloat>
{/if}
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
<ComponentShortcutListener
  shortcuts={[
    {
      shortcut: shortcutsConfig.create,
      callback: handleCreateTask
    }
  ]}
/>
