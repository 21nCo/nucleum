<script lang="ts">
  import { focusItemsStore } from "$lib/client/products/pointron/focus/session.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import GoalSearchThumbnail from "../../../goals/thumbnails/GoalSearchThumbnail.svelte";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import { goalStore } from "$lib/client/components/goals/goal.store";
  import { GoalType } from "$lib/client/components/goals/goal.type";
  let label: string = "";
  let inputRef: any;
  let searchStore = new SearchStore();

  async function onSelect(event: any) {
    let task = event?.detail?.item;
    console.log("Task: ", task);
    if (!task || !task.id) return;
    if ($focusItemsStore.goals.some(resourceInList(task))) {
      toasts.error("Task already exists in focus list");
      return;
    }
    reset();
    await focusItemsStore.addGoal(task.id);
  }

  function reset() {
    inputRef.reset();
  }

  async function handleEmptyEnter(
    e: CustomEvent<{ event: KeyboardEvent; value: string }>
  ) {
    const task = await goalStore.save({
      label: e.detail.value,
      type: GoalType.INDEFINITE
    });
    if (!task || !Array.isArray(task) || task.length === 0) {
      toasts.error("Something went wrong. Please try again later.");
      return;
    }
    await focusItemsStore.addGoal(task[0].id);
    reset();
  }

  async function searchCallback(searchQuery: string) {
    console.log("Search: ", searchQuery);
    const goals = await searchStore.select({
      resource: Resource.goal,
      searchQuery,
      isIncludeSubItems: true
    });
    const tasks = await searchStore.select({
      resource: Resource.task,
      searchQuery
    });
    console.log({ goals, tasks });
    return [...goals, ...tasks];
  }
</script>

<div class="flex items-center gap-2 w-full px-4 h-14">
  <TextSearchInput
    on:blur
    on:focus
    on:select={onSelect}
    on:empty-enter={handleEmptyEnter}
    bind:value={label}
    bind:this={inputRef}
    emptyStateLabel="No goals or tasks found. Press **Enter** to create a new task."
    searchResultComponent={GoalSearchThumbnail}
    {searchCallback}
    style={InputStyle.PLAIN}
    popoverOptions={{ offsetInPx: 16 }}
    placeholder="+ start typing a goal or task name..."
  />

  <div class=" justify-end items-center">
    {#if label}
      <div class="flex gap-2">
        <Button
          on:click={reset}
          icon="cross"
          tooltip="Clear"
          tooltipOptions={{
            placement: Placement.Left
          }}
        />
      </div>
    {/if}
  </div>
</div>
