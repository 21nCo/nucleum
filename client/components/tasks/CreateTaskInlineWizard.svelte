<script lang="ts">
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { createEventDispatcher, onMount } from "svelte";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "@21n/components/flux/resourceStores/resource.type";
  import { resourceAction } from "@21n/components/flux/resourceStores/resource.utils";
  import {
    GoalStatus,
    type IGoal,
    type IGoalThumb
  } from "@21n/components/goals/goal.type";
  import modalEvent from "@21n/components/modal/modal.store";
  import { SearchStore } from "@21n/components/record/record.store";
  import { taskStore } from "@21n/components/tasks/task.store";
  import { goalStore } from "@21n/components/goals/goal.store";
  import TaskThumbnailGoalLabel from "@21n/components/tasks/TaskThumbnailGoalLabel.svelte";
  import { Product } from "@21n/products/product.type";
  import { appStore } from "@21n/stores/app.store";
  import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
  import { appEvents, toasts } from "@21n/stores/notification.store";
  import GoalSearchResultItem from "@21n/components/goals/GoalSearchResultItem.svelte";
  import Button from "@21n/elements/button/Button.svelte";
  import { ButtonStyle } from "@21n/types/button.type";
  import { GlobalEvent } from "@21n/types/event.enum";
  export let date: Date | undefined = undefined;
  export let goalId: IRecordId | undefined = undefined;
  const action = resourceAction(Resource.task, ResourceActionType.CREATE);
  let label = "";
  let inputRef: TextInput | undefined;
  let isShowGoalPicker = false;
  let goalSearchQuery = "";
  let goalSearchInput: TextSearchInput | undefined;
  let searchStore = new SearchStore(Resource.goal);
  let goal: IGoal | undefined = undefined;
  let isFocusing = false;
  let isCreateInProgress = false;
  const dispatch = createEventDispatcher();
  onMount(() => {
    const appEventSub = appEvents.subscribe((x) => {
      if (x.event === GlobalEvent.ENTER && isFocusing) {
        handleCreate();
      }
    });

    const initialize = async () => {
      if (goalId) {
        goal = await goalStore.select(goalId);
        isShowGoalPicker = false;
      }
    };

    void initialize();

    return () => {
      appEventSub();
    };
  });

  function handleKeydown(event: CustomEvent<KeyboardEvent>) {
    const keyboardEvent = event.detail;
    if (!(keyboardEvent instanceof KeyboardEvent)) return;
    if (keyboardEvent.key === "ArrowDown") {
      keyboardEvent.preventDefault();
      isShowGoalPicker = true;
      setTimeout(() => {
        goalSearchInput?.focus();
        goalSearchInput?.showDefaultResults();
      }, 0);
    }
  }

  function handleKeydownFromGoalSearch(event: CustomEvent<any>) {
    const keyboardEvent = event?.detail?.event ?? event?.detail;
    if (!(keyboardEvent instanceof KeyboardEvent)) return;
    if (keyboardEvent.key === "ArrowUp") {
      keyboardEvent.preventDefault();
      isShowGoalPicker = false;
      setTimeout(() => {
        inputRef?.focus();
      }, 0);
    }
  }

  function resolveGoalThumb(goal: IGoal) {
    return goal as unknown as IGoalThumb;
  }

  async function handleCreate(event?: any) {
    if (isCreateInProgress) return;
    try {
      isCreateInProgress = true;
      const result = await taskStore.save(
        {
          label,
          dateUnix: date ? resolveUnixTimestamp(date) : undefined,
          goalId: goalId ?? goal?.id
        },
        {
          context: action
        }
      );
      if (result) {
        label = "";
        if (event instanceof KeyboardEvent && event.shiftKey === true) {
          toasts.success("Task created successfully");
          return;
        } else {
          dispatch("close");
        }
      }
      return result;
    } finally {
      isCreateInProgress = false;
    }
  }

  async function handleCreateOnEnter(e: any) {
    const result = await handleCreate(e.detail.event);
    if (result) modalEvent.hide(action);
  }

  function searchGoalCallback(query: string) {
    return searchStore.select({
      searchQuery: query,
      limit: 30,
      filters: {
        status: {
          notEquals: GoalStatus.COMPLETED
        }
      }
    });
  }
</script>

<div
  class="w-full h-fit flex flex-col gap-2 rounded-md border border-brs3 p-2 transition-all duration-200"
>
  <div class="flex items-center gap-3">
    <div class="flex-1">
      <TextInput
        bind:value={label}
        bind:this={inputRef}
        on:mount={() => {
          inputRef?.focus();
        }}
        on:focus={() => (isFocusing = true)}
        on:blur={() => (isFocusing = false)}
        on:keydown={handleKeydown}
        placeholder="Enter task name"
        testId="task-name-input"
        style={InputStyle.PLAIN}
        on:enter={handleCreateOnEnter}
      />
    </div>
    <div class="flex items-center gap-1">
      <Button
        icon="save"
        on:click={handleCreate}
        size={Size.sm}
        tooltip="Create task"
        shortcut={GlobalEvent.ENTER}
      />
      <Button icon="cross" on:click={() => dispatch("close")} size={Size.sm} />
    </div>
  </div>
  <div class="w-full flex items-center justify-between">
    {#if isShowGoalPicker}
      <div
        class="flex items-center h-fit flex-grow transition-all duration-200"
      >
        <TextSearchInput
          bind:value={goalSearchQuery}
          bind:this={goalSearchInput}
          searchCallback={searchGoalCallback}
          searchResultComponent={GoalSearchResultItem}
          on:keydown={handleKeydownFromGoalSearch}
          placeholder="Search to assign a goal"
          on:select={(e) => {
            goal = e.detail.item;
            isShowGoalPicker = false;
          }}
          style={InputStyle.PLAIN}
        />
        <Button
          icon="cross"
          size={Size.sm}
          on:click={() => (isShowGoalPicker = false)}
        />
      </div>
    {:else if goal}
      <div class="min-w-0 flex-1 transition-all duration-200">
        <TaskThumbnailGoalLabel
          goal={resolveGoalThumb(goal)}
          on:clearGoal={() => {
            isShowGoalPicker = true;
            goal = undefined;
          }}
          accessPoint={ResourceAccessPoint.CAPTURE}
        />
      </div>
    {/if}
    <div class="flex gap-2 items-center">
      {#if !isShowGoalPicker && !goal && ($appStore.product === Product.POINTRON || $appStore.product === Product.NUCLEUS)}
        <Button
          label="Assign goal"
          size={Size.xs}
          style={ButtonStyle.OUTLINED}
          on:click={() => (isShowGoalPicker = true)}
        />
      {/if}
      <span class="flex items-center shrink-0">
        <DatePicker
          bind:date
          style={InputStyle.PLAIN}
          size={Size.sm}
          variant={date ? "inline-with-icon" : "icon-only"}
        />
      </span>
    </div>
  </div>
</div>
