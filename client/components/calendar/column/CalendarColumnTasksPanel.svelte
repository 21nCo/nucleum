<script lang="ts">
  import { onMount } from "svelte";
  import type { ITaskThumb } from "../../tasks/task.type";
  import TaskRecords from "../../tasks/TaskRecords.svelte";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "../../flux/resourceStores/resource.type";
  import { Resource } from "../../flux/resourceStores/resource.enum";
  import { SearchStore } from "../../record/record.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import { resourceAction } from "../../flux/resourceStores/resource.utils";
  import ComponentBaseLayer from "$lib/client/layout/layers/ComponentBaseLayer.svelte";
  import {
    PersistenceActionType,
    RemovalProperty
  } from "$lib/client/types/data.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { Size } from "$lib/client/types/size.enum";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { shortcutsConfig } from "../../shortcuts/shortcuts.config";
  import ComponentShortcutListener from "../../shortcuts/ComponentShortcutListener.svelte";
  import { uiState } from "$lib/client/stores/uiState/uiState.store";
  import { UIState } from "$lib/client/stores/uiState/uiState.type";
  export let date: Date;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CALENDAR;
  let isRefreshing = false;
  let tasks: ITaskThumb[] = [];
  let completedTasksCount = 0;
  let showCompletedTasks = refreshShowCompletedTasksState();
  onMount(async () => {
    await refreshTimeline();
  });
  const inboxZeroIllustrations = ["inboxZero", "travel", "check", "globe"];

  function refreshShowCompletedTasksState() {
    return (
      uiState.getState(UIState.showCompletedCalendarTasks, {
        isProductScoped: true,
        isDeviceScoped: true
      }) ?? false
    );
  }

  async function refreshTimeline() {
    isRefreshing = true;
    await loadTasks();
    isRefreshing = false;
  }

  async function loadTasks() {
    const allTasks = await new SearchStore(Resource.task).select({
      filters: {
        dateUnix: tzStore.resolveTimePeriodFilterForDay(date)
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
      isProductScoped: true,
      isDeviceScoped: true
    });
    loadTasks();
  }
</script>

<div class="relative w-full h-full">
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
            icon={showCompletedTasks ? "ph:eye-slash-light" : ""}
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
          icon={showCompletedTasks ? "ph:eye-slash-light" : ""}
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
        icon="ph:plus-light"
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
          icon: "ph:plus-light",
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
<ComponentShortcutListener
  shortcuts={[
    {
      shortcut: shortcutsConfig.create,
      callback: handleCreateTask
    }
  ]}
/>
