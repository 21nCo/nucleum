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
  import { onMount } from "svelte";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import type { IFocusItem } from "$lib/client/types/pointron/session.type";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { taskStore } from "$lib/client/components/tasks/task.store";
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

  async function refresh() {
    isRefreshing = true;
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
        isIncludeSubItems: true
      }
    );
    tasks = await taskStore.selectMany({
      filters: {
        id: $focusItemsStore.items.map((x) => x.id.toString())
      }
    });
    isRefreshing = false;
  }

  onMount(() => {
    refresh();
    focusItemsStore.subscribe((x) => {
      if (x.refreshId) {
        refresh();
      }
    });
  });
</script>

<div
  class={cn("flex flex-col w-full h-full gap-6 pb-48 overflow-auto", {
    "pt-6": isInEditMode
  })}
>
  {#if $focusItemsStore.items?.length === 0 && !isInEditMode && $activeSession.isSessionRunning}
    <div class="h-full">
      <EmptyStatusView
        size={Size.sm}
        isLoadingState={isRefreshing}
        mainText="No focus items added."
        subText="Toggle edit mode to add focus items."
      />
    </div>
  {:else if focusItems.length > 0}
    {#each focusItems as focusItem, index (focusItem.id)}
      <FocusItem
        {isInEditMode}
        {focusItem}
        {tasks}
        {goals}
        isFocusAddTask={$lastActiveGoalIdForEditing
          ? $lastActiveGoalIdForEditing === focusItem.id
          : index === $focusItemsStore.items.length - 1}
      />
    {/each}
  {/if}

  {#if !$activeSession.isSessionRunning || isInEditMode}
    <div class="flex flex-col gap-2 w-full pt-4">
      <div
        class="flex items-center w-full border rounded-md {isFocusingAddGoal
          ? 'border-aps1'
          : 'border-brs3'}"
      >
        <AddFocusItem on:blur={onBlur} on:focus={onfocus} />
      </div>
    </div>
  {/if}
</div>
