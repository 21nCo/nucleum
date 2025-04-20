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
  import { resolveTimePeriodFilterForDay } from "$lib/client/elements/datetime/datetime.utils";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { shortcutsConfig } from "../../shortcuts/shortcuts.config";
  import ComponentShortcutListener from "../../shortcuts/ComponentShortcutListener.svelte";
  export let date: Date;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.CALENDAR;
  let isRefreshing = false;
  let tasks: ITaskThumb[] = [];
  onMount(async () => {
    await refreshTimeline();
  });

  async function refreshTimeline() {
    isRefreshing = true;
    await loadTasks();
    isRefreshing = false;
  }

  async function loadTasks() {
    tasks = await new SearchStore(Resource.task).select({
      filters: {
        dateUnix: resolveTimePeriodFilterForDay(date)
      }
    });
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
    const params = event.detail?.params;
    if (params?.action === PersistenceActionType.INSERT) {
      refreshTimeline();
    } else if (
      params?.action === PersistenceActionType.MERGE &&
      (params?.record?.dateUnix ||
        Object.values(RemovalProperty).some(
          (x) => params?.record[x] !== undefined
        ))
    ) {
      refreshTimeline();
    }
    //TODO - add for bulk merge case
  }
</script>

<div class="relative w-full h-full">
  {#if isRefreshing || tasks.length === 0}
    <EmptyStatusView
      isLoadingState={isRefreshing}
      mainText="No tasks found"
      subText="Choose a different date or create a task"
      actionText="Create task"
      on:click={handleCreateTask}
      loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
    />
  {:else}
    <div class="overflow-auto py-3">
      <TaskRecords data={tasks} {accessPoint} />
    </div>
    <div class="flex justify-center items-center">
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
  subscribeToContext={new Set([
    ResourceAccessPoint.CALENDAR,
    resourceAction(Resource.task, ResourceActionType.CREATE)
  ])}
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
