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
  import { taskStore } from "$lib/client/components/tasks/task.store";
  import { TaskType } from "$lib/client/components/tasks/task.type";
  export let label: string = "";
  let inputRef: any;
  let searchStore = new SearchStore(Resource.task);

  async function onSelect(event: any) {
    let task = event?.detail?.item;
    console.log("Task: ", task);
    if (!task || !task.id) return;
    if ($focusItemsStore.tasks.some(resourceInList(task))) {
      toasts.error("Task already exists in focus list");
      return;
    }
    reset();
    await focusItemsStore.addTask(task.id);
  }

  function reset() {
    inputRef.reset();
  }

  async function handleEmptyEnter(
    e: CustomEvent<{ event: KeyboardEvent; value: string }>
  ) {
    const task = await taskStore.save({
      label: e.detail.value,
      type: TaskType.INDEFINITE
    });
    if (!task || !Array.isArray(task) || task.length === 0) {
      toasts.error("Something went wrong. Please try again later.");
      return;
    }
    await focusItemsStore.addTask(task[0].id);
    reset();
  }

  async function searchCallback(searchQuery: string) {
    console.log("Search: ", searchQuery);
    const tasks = await searchStore.select({
      searchQuery
    });
    console.log("Tasks: ", tasks);
    return tasks;
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
    emptyStateLabel="No tasks found. Press **Enter** to create a new task."
    searchResultComponent={GoalSearchThumbnail}
    {searchCallback}
    style={InputStyle.PLAIN}
    popoverOptions={{ offsetInPx: 16 }}
    placeholder="+ start typing a task name..."
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
