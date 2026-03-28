<script lang="ts">
  import {
    focusItemsStore,
    lastActiveGoalIdForEditing,
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import { setContext } from "svelte";
  import FocusItem from "@21n/products/pointron/focus/elements/focusitem/FocusItem.svelte";
  import AddFocusItem from "@21n/products/pointron/focus/elements/focusitem/AddFocusItem.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import { onDestroy, onMount } from "svelte";
  import {
    isSameResource,
    removeDuplicatesFilter,
    resourceInList,
    shiftResourceInArray
  } from "@21n/components/flux/resourceStores/resource.utils";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import type { IFocusItem } from "@21n/types/pointron/session.type";
  import { goalStore } from "@21n/components/goals/goal.store";
  import { taskStore } from "@21n/components/tasks/task.store";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { appEvents, toasts } from "@21n/stores/notification.store";
  import { ErrorMessage } from "@21n/components/error/error.type";
  import type { IRecordId } from "@21n/types/data.type";
  import { LoadingAnimationType } from "@21n/types/feedback.type";
  import { fullScreen } from "@21n/components/modal/modal.store";
  import { PointronEvent } from "@21n/types/pointron/pointronEvent.enum";
  import PanelSwitcher from "@21n/elements/switcher/PanelSwitcher.svelte";
  import { BarStyle, PanelSwitcherStyle } from "@21n/types/switcher.enum";
  import Records from "@21n/components/record/Records.svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { ResourceAccessPoint } from "@21n/components/flux/resourceStores/resource.type";
  import Text from "@21n/elements/text/Text.svelte";
  import { TextStyle } from "@21n/types/text.enum";
  import { uiState } from "@21n/stores/uiState/uiState.store";
  import { UIState } from "@21n/stores/uiState/uiState.type";
  import CalendarColumnTasksPanel from "@21n/components/calendar/column/CalendarColumnTasksPanel.svelte";
  import { reorderList } from "@21n/actions/rearrange.action";
  export let isInEditMode: boolean = false;
  let isFocusingAddGoal: boolean = false;
  let focusItems: IFocusItem[] = [];
  let goals: IGoalThumb[] = [];
  let tasks: ITaskThumb[] = [];
  let isRefreshing: boolean = false;
  let selectedPickFromPanel: "recents" | "calendar" =
    uiState.getState(UIState.focusItemsPickFromPanel) ?? "recents";

  setContext("focus-item-context", {
    refreshList: () => refresh({ isShowLoadingPulse: true })
  });

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
      .filter((x): x is IRecordId => Boolean(x));
    focusItems = [
      ...($focusItemsStore.items.filter(
        (x) => !tasksWithGoal.some(resourceInList(x))
      ) ?? [])
    ];
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
      if (
        x.event === PointronEvent.SESSION_CLOSED ||
        x.event === PointronEvent.REFRESH_FOCUSITEMS
      ) {
        refresh({ isShowLoadingPulse: true });
      }
    });
    const state = uiState.getState(UIState.recentFocusItems);
    if (state) {
      await focusItemsStore.refreshRecents(state);
    }
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
        return {
          ...x,
          tasks: [...(x.tasks ?? []), task.id].filter(removeDuplicatesFilter)
        };
      }
      return x;
    });
  }

  async function onRemove(event: any) {
    const id = event.detail;
    focusItemsStore.removeFocusItem(id);
    if ($currentFocusItem && isSameResource($currentFocusItem, id)) {
      await activeSession.stopCurrentFocusItem();
    }
    refresh();
  }

  async function onCreateGoal(event: any) {
    const label = event.detail;
    let goal = await goalStore.save({
      label,
      isPreventOpenAfterCreate: true
    });
    if (!goal) return;
    await focusItemsStore.addGoal(goal.id);
    refresh();
  }

  async function onCreateStandaloneTask(event: any) {
    const label = event.detail;
    await focusItemsStore.addNewTask(label);
    refresh();
  }

  function onReorderFocusItems(event: any) {
    const { fromId, toId } = event;
    focusItemsStore.rearrangeFocusItems(fromId, toId);
    focusItems = shiftResourceInArray(focusItems, fromId, toId);
  }

  function onReorderTasksInGoal(event: any) {
    const { fromId, toId, goalId } = event.detail;
    focusItemsStore.rearrangeTasksInGoal(goalId, fromId, toId);
    focusItems = focusItems.map((item) => {
      if (isSameResource(item.id, goalId) && item.tasks) {
        return {
          ...item,
          tasks: shiftResourceInArray(item.tasks, fromId, toId)
        };
      }
      return item;
    });
  }
</script>

<div
  class={cn("flex flex-col w-full h-full pb-48 overflow-auto", {
    "pt-6": isInEditMode && $focusItemsStore.items.length > 0,
    "gap-6": isInEditMode,
    "gap-4": !isInEditMode
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
      <!-- TODO - input is added to avoid flickering issue on extra wide screens. Without this, causing layout shift when refreshing -->
      <input class="bg-none opacity-0" />
    </div>
  {:else if $focusItemsStore.items?.length > 0 && focusItems.length > 0}
    <div
      use:reorderList={{
        listId: "focusItems",
        draggedOverClass: "outline outline-aps1",
        dragImage: "dragimage",
        onDrop: onReorderFocusItems
      }}
      class={cn("flex flex-col", {
        "gap-6": isInEditMode,
        "gap-4": !isInEditMode
      })}
    >
      {#each focusItems as focusItem, index (focusItem.id)}
        <div
          data-index={index}
          data-id={focusItem.id}
          draggable={!$activeSession.isSessionRunning || isInEditMode}
        >
          <FocusItem
            {isInEditMode}
            {focusItem}
            {tasks}
            {goals}
            on:createNew={onCreateNewGoalTask}
            on:select={onSelect}
            on:remove={onRemove}
            on:reorderTasks={onReorderTasksInGoal}
            isFocusAddTask={$lastActiveGoalIdForEditing
              ? $lastActiveGoalIdForEditing === focusItem.id
              : index === $focusItemsStore.items.length - 1}
          />
        </div>
      {/each}
    </div>
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
  {#if isInEditMode && !isRefreshing}
    <div class="flex flex-col gap-4 w-full pt-12">
      <div class="flex items-center gap-2">
        <div class="flex-grow">
          <Text content="Pick from" style={TextStyle.PANEL_HEADING_SMALL} />
        </div>
        <PanelSwitcher
          items={[
            {
              label: "Recents",
              value: "recents"
            },
            {
              label: "Today's tasks",
              value: "calendar"
            }
          ]}
          bind:value={selectedPickFromPanel}
          style={PanelSwitcherStyle.BAR}
          barStyle={BarStyle.DOT}
          size={Size.xs}
          on:switch={() => {
            uiState.setState(
              UIState.focusItemsPickFromPanel,
              selectedPickFromPanel
            );
          }}
        />
      </div>
      {#if selectedPickFromPanel === "recents"}
        {#if $focusItemsStore.recents && $focusItemsStore.recents.length > 0}
          <Records
            data={$focusItemsStore.recents.map((x) => x.item).slice(0, 5)}
            resource={Resource.everything}
            accessPoint={ResourceAccessPoint.PICKER}
          />
        {:else}
          <div class="flex pt-12">
            <EmptyStatusView
              size={Size.sm}
              isLoadingState={isRefreshing}
              loadingAnimation={LoadingAnimationType.FOCUS_ITEMS_PULSE}
              mainText="No recents found."
              subText="Recent focus items will appear here as you complete few focus sessions."
            />
          </div>
        {/if}
      {:else if selectedPickFromPanel === "calendar"}
        <CalendarColumnTasksPanel
          date={new Date()}
          accessPoint={ResourceAccessPoint.PICKER}
        />
      {/if}
    </div>
  {/if}
</div>
