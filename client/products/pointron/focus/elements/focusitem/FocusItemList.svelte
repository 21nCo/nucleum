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
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { onMount } from "svelte";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import type { IFocusGoal } from "$lib/client/types/pointron/session.type";

  export let isInEditMode: boolean = false;
  let isFocusingAddGoal: boolean = false;
  let goals: IGoalThumb[] = [];
  let isRefreshing: boolean = false;

  function onBlur() {
    isFocusingAddGoal = false;
  }

  function onfocus() {
    isFocusingAddGoal = true;
  }

  async function refresh() {
    isRefreshing = true;
    goals = await goalStore.selectMany({
      filters: {
        id: $focusItemsStore.goals.map((x) => x.id.toString())
      }
    });
    isRefreshing = false;
  }

  onMount(() => {
    refresh();
  });

  function resolveTodos(focusItem: IFocusGoal) {
    return $focusItemsStore.todos.filter((x) =>
      focusItem.todos?.some(resourceInList(x.id))
    );
  }
</script>

<div
  class={cn("flex flex-col w-full h-full gap-6 pb-48 overflow-auto", {
    "pt-6": isInEditMode
  })}
>
  {#if $focusItemsStore.goals?.length === 0 && !isInEditMode && $activeSession.isSessionRunning}
    <div class="h-full">
      <EmptyStatusView
        size={Size.sm}
        isLoadingState={isRefreshing}
        mainText="No focus items added."
        subText="Toggle edit mode to add focus items."
      />
    </div>
  {:else if goals.length > 0}
    {#each goals as item, index (item)}
      {@const focusItem = $focusItemsStore.goals.find(resourceInList(item))}
      {#if focusItem}
        <FocusItem
          {isInEditMode}
          task={item}
          {focusItem}
          todos={resolveTodos(focusItem)}
          isFocusAddTask={$lastActiveGoalIdForEditing
            ? $lastActiveGoalIdForEditing === item.id
            : index === $focusItemsStore.goals.length - 1}
        />
      {/if}
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
