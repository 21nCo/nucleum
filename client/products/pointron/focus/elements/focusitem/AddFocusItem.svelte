<script lang="ts">
  import { focusItemsStore } from "@21n/products/pointron/focus/session.store";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { toasts } from "@21n/stores/notification.store";
  import Button from "@21n/elements/button/Button.svelte";
  import { Placement } from "@21n/types/direction.enum";
  import { InputStyle } from "@21n/types/input.type";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import { resourceInList } from "@21n/components/flux/resourceStores/resource.utils";
  import { SearchStore } from "@21n/components/record/record.store";
  import FocusItemSearchResultItem from "@21n/products/pointron/focus/elements/focusitem/FocusItemSearchResultItem.svelte";
  import { GoalStatus } from "@21n/components/goals/goal.type";
  let label: string = "";
  let inputRef: any;
  let searchStore = new SearchStore();
  let {
    onBlur = undefined,
    onFocus = undefined,
    onSelect = undefined,
    onCreateGoal = undefined,
    onCreateTask = undefined
  }: {
    onBlur?: ((event: CustomEvent<void>) => void) | undefined;
    onFocus?: ((event: CustomEvent<void>) => void) | undefined;
    onSelect?: ((event: CustomEvent<any>) => void) | undefined;
    onCreateGoal?: ((event: CustomEvent<string>) => void) | undefined;
    onCreateTask?: ((event: CustomEvent<string>) => void) | undefined;
  } = $props();
  async function handleSelect(event: any) {
    let item = event?.detail?.item;
    if (!item || !item.id) return;
    if ($focusItemsStore.items.some(resourceInList(item))) {
      toasts.error("Item already exists in focus list");
      return;
    }
    reset();
    const selectEvent = new CustomEvent("select", { detail: item });
    onSelect?.(selectEvent);
  }

  function reset() {
    label = "";
    inputRef?.reset();
  }

  async function handleEmptyEnter(
    e: CustomEvent<{ event: KeyboardEvent; value: string }>
  ) {
    if (e.detail.event.shiftKey) {
      const createGoalEvent = new CustomEvent<string>("createGoal", {
        detail: e.detail.value
      });
      onCreateGoal?.(createGoalEvent);
      setTimeout(() => {
        reset();
      }, 500);
      return;
    }
    reset();
    const createTaskEvent = new CustomEvent<string>("createTask", {
      detail: e.detail.value
    });
    onCreateTask?.(createTaskEvent);
  }

  async function searchCallback(searchQuery: string) {
    const goals = await searchStore.select({
      resource: Resource.goal,
      searchQuery,
      filters: {
        status: {
          notEquals: GoalStatus.COMPLETED
        }
      },
      isStrictSearch: true,
      isIncludeSubItems: true
    });
    const tasks = await searchStore.select({
      resource: Resource.task,
      searchQuery,
      filters: {
        isChecked: false
      },
      isStrictSearch: true
    });
    return [...goals, ...tasks];
  }
</script>

<div class="flex items-center gap-2 w-full px-4 h-14">
  <TextSearchInput
    {onBlur}
    {onFocus}
    onSelect={handleSelect}
    onEmptyEnter={handleEmptyEnter}
    bind:value={label}
    bind:this={inputRef}
    icon="plus"
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
          onclick={reset}
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
