<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import TaskRecords from "@21n/components/tasks/TaskRecords.svelte";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { BulkEditor, SearchStore } from "@21n/components/record/record.store";
  import { appStore } from "@21n/stores/app.store";
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import { RemovalProperty, type IRecordId } from "@21n/types/data.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { toasts } from "@21n/stores/notification.store";
  import { dragSelection } from "@21n/actions/dragSelection.action";
  import { bulkEditStore } from "@21n/components/record/bulkedit.store";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";

  let {
    date,
    accessPoint = ResourceAccessPoint.CALENDAR
  }: {
    date: Date;
    accessPoint?: ResourceAccessPoint;
  } = $props();

  let isRefreshing = $state(false);
  let tasks = $state<ITaskThumb[]>([]);
  let isInSelectionMode = $state(false);
  onMount(async () => {
    await refreshTimeline();
  });

  const multiSelectContext = $derived({
    resource: Resource.task,
    accessPoint
  });

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
    tasks = [...(allTasks ?? [])];
  }

  async function handleCreateTask() {
    appStore.runAction(PointronAction.CREATE_TASK_INLINE, {
      componentParams: { date }
    });
  }

  function onResourceMutation() {
    refreshTimeline();
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
  class="relative flex flex-col w-full h-full overflow-y-auto"
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
  <div class="flex py-3 w-full flex-grow styledscroll">
    <TaskRecords
      data={tasks}
      {accessPoint}
      {isRefreshing}
      {date}
      onCreate={handleCreateTask}
    />
  </div>

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
</div>
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.task])}
  subscriptionPropsForMergeAction={[
    RemovalProperty.IS_ARCHIVED,
    RemovalProperty.TRASH_INFORMATION,
    "dateUnix",
    "isChecked",
    "goalId"
  ]}
  onSyncDown={() => {
    refreshTimeline();
  }}
  onChange={onResourceMutation}
/>
