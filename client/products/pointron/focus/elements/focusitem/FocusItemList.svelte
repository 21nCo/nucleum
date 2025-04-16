<script lang="ts">
  import {
    focusItemsStore,
    lastActiveGoalIdForEditing,
    activeSession
  } from "$lib/client/products/pointron/focus/session.store";
  import FocusItem from "./FocusItem.svelte";
  import AddFocusItem from "./AddFocusItem.svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IGoalThumb } from "$lib/client/components/goals/goal.type";
  import { onDestroy, onMount } from "svelte";
  import {
    isSameResource,
    resourceInList
  } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import type { IFocusItem } from "$lib/client/types/pointron/session.type";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { taskStore } from "$lib/client/components/tasks/task.store";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { appEvents, toasts } from "$lib/client/stores/notification.store";
  import { ErrorMessage } from "$lib/client/components/error/error.type";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { LoadingAnimationType } from "$lib/client/types/feedback.type";
  import { fullScreen } from "$lib/client/components/modal/modal.store";
  import { PointronEvent } from "$lib/client/types/pointron/pointronEvent.enum";
  export let isInEditMode: boolean = false;
  let isFocusingAddGoal: boolean = false;
  let focusItems: IFocusItem[] = [];
  let goals: IGoalThumb[] = [];
  let tasks: ITaskThumb[] = [];
  let isRefreshing: boolean = false;

  function onBlur() {
    isFocusingAddGoal = false;
  }

  function onfocus() {
    isFocusingAddGoal = true;
  }

  async function refresh(params?: { isShowLoadingPulse?: boolean }) {
    if (params?.isShowLoadingPulse) isRefreshing = true;
    const tasksWithGoal = $focusItemsStore.items
      .map((x) => x.tasks)
      .flat()
      .filter((x) => x);
    focusItems = $focusItemsStore.items.filter(
      (x) => !tasksWithGoal.some(resourceInList(x))
    );
    goals = await goalStore.selectMany(
      {
        filters: {
          id: $focusItemsStore.items.map((x) => x.id.toString())
        }
      },
      {
        isIncludeSubItems: true,
        isExpand: true
      }
    );
    tasks = await taskStore.selectMany(
      {
        filters: {
          id: $focusItemsStore.items.map((x) => x.id.toString())
        }
      },
      {
        isExpand: true
      }
    );
    isRefreshing = false;
  }

  let fullScreenSub: () => void;
  let appEventSub: () => void;
  onMount(async () => {
    while (!focusItemsStore.isInitialized) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    refresh({ isShowLoadingPulse: true });
    fullScreenSub = fullScreen.subscribe((x) => {
      if (!x.path) {
        refresh();
      }
    });
    appEventSub = appEvents.subscribe((x) => {
      if (x.event === PointronEvent.SESSION_CLOSED) {
        refresh({ isShowLoadingPulse: true });
      }
    });
  });

  onDestroy(() => {
    if (fullScreenSub) fullScreenSub();
    if (appEventSub) appEventSub();
  });

  async function onCreateNewGoalTask(event: any) {
    try {
      const { label, goalId } = event.detail;
      const result = await focusItemsStore.addNewTask(label, goalId);
      if (isValidArrayWithData(result)) {
        addTask(result![0], goalId);
      } else {
        toasts.error(ErrorMessage.DEFAULT);
      }
    } catch (error) {
      toasts.error(ErrorMessage.DEFAULT);
    }
  }

  async function onSelect(event: any) {
    const item = event.detail;
    if (!item || !item.id) return;
    if (item.goal || item.goalId) {
      const goalId = item.goal?.id ?? item.goalId;
      await focusItemsStore.addTask(item.id, goalId);
      addTask(item, goalId);
      if (!goals.some(resourceInList(goalId))) {
        refresh();
      }
    } else {
      await focusItemsStore.addGoal(item.id);
      refresh();
    }
  }

  function addTask(task: ITaskThumb, goalId?: IRecordId) {
    tasks = [...tasks, task];
    focusItems = focusItems.map((x) => {
      if (goalId && isSameResource(x.id, goalId)) {
        return { ...x, tasks: [...(x.tasks ?? []), task.id] };
      }
      return x;
    });
  }

  function onRemove(event: any) {
    const id = event.detail;
    focusItemsStore.removeFocusItem(id);
    refresh();
  }

  async function onCreateGoal(event: any) {
    const label = event.detail;
    await focusItemsStore.addNewGoal(label);
    refresh();
  }

  async function onCreateStandaloneTask(event: any) {
    const label = event.detail;
    await focusItemsStore.addNewTask(label);
    refresh();
  }
</script>

<div
  class={cn("flex flex-col w-full h-full gap-6 pb-48 overflow-auto", {
    "pt-6": isInEditMode && $focusItemsStore.items.length > 0
  })}
>
  {#if ($focusItemsStore.items?.length === 0 && !isInEditMode && $activeSession.isSessionRunning) || isRefreshing}
    <div class="h-full">
      <EmptyStatusView
        size={Size.sm}
        isLoadingState={isRefreshing}
        loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
        mainText="No focus items added."
        subText="Toggle edit mode to add focus items."
      />
    </div>
  {:else if $focusItemsStore.items?.length > 0 && focusItems.length > 0}
    {#each focusItems as focusItem, index (focusItem.id)}
      <FocusItem
        {isInEditMode}
        {focusItem}
        {tasks}
        {goals}
        on:createNew={onCreateNewGoalTask}
        on:select={onSelect}
        on:remove={onRemove}
        isFocusAddTask={$lastActiveGoalIdForEditing
          ? $lastActiveGoalIdForEditing === focusItem.id
          : index === $focusItemsStore.items.length - 1}
      />
    {/each}
  {/if}

  {#if !isRefreshing && (!$activeSession.isSessionRunning || isInEditMode)}
    <div class="flex flex-col gap-2 w-full pt-4">
      <div
        class="flex items-center w-full border rounded-md {isFocusingAddGoal
          ? 'border-aps1'
          : 'border-brs3'}"
      >
        <AddFocusItem
          on:blur={onBlur}
          on:focus={onfocus}
          on:select={onSelect}
          on:createGoal={onCreateGoal}
          on:createTask={onCreateStandaloneTask}
        />
      </div>
    </div>
  {/if}
</div>
