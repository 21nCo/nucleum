<script lang="ts">
  import { focusItemsStore } from "$lib/client/products/pointron/focus/session.store";
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import { toasts } from "$lib/client/stores/notification.store";
  import Button from "$lib/client/elements/button/Button.svelte";
  import { Placement } from "$lib/client/types/direction.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { SearchStore } from "$lib/client/components/record/record.store";
  import FocusItemSearchResultItem from "./FocusItemSearchResultItem.svelte";
  let label: string = "";
  let inputRef: any;
  let searchStore = new SearchStore();

  async function onSelect(event: any) {
    let item = event?.detail?.item;
    if (!item || !item.id) return;
    if ($focusItemsStore.items.some(resourceInList(item))) {
      toasts.error("Item already exists in focus list");
      return;
    }
    reset();
    if (item.goal) {
      await focusItemsStore.addTask(item.id, item.goal.id);
    } else {
      await focusItemsStore.addGoal(item.id);
    }
  }

  function reset() {
    inputRef.reset();
  }

  async function handleEmptyEnter(
    e: CustomEvent<{ event: KeyboardEvent; value: string }>
  ) {
    if (e.detail.event.shiftKey) {
      await focusItemsStore.addNewGoal(e.detail.value);
      reset();
      return;
    }
    await focusItemsStore.addNewTask(e.detail.value);
    reset();
  }

  async function searchCallback(searchQuery: string) {
    const goals = await searchStore.select({
      resource: Resource.goal,
      searchQuery,
      isIncludeSubItems: true
    });
    const tasks = await searchStore.select({
      resource: Resource.task,
      searchQuery,
      filters: {
        isChecked: false
      }
    });
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
    icon="ph:plus-light"
    emptyStateLabel={{
      mainText: "No goals or tasks found.",
      subText:
        "Press **Enter** to create a new task or **Shift+Enter** to create a new goal."
    }}
    searchResultComponent={FocusItemSearchResultItem}
    {searchCallback}
    style={InputStyle.PLAIN}
    popoverOptions={{ offsetInPx: 16 }}
    placeholder="start typing a goal or task name..."
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
