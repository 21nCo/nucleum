<script lang="ts">
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import type { IRecordId } from "@21n/types/data.type";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { onMount } from "svelte";
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

  let {
    date: initialDate = undefined,
    goalId: initialGoalId = undefined,
    onClose = undefined
  }: {
    date?: Date | undefined;
    goalId?: IRecordId | undefined;
    onClose?: ((event: CustomEvent<void>) => void) | undefined;
  } = $props();

  const action = resourceAction(Resource.task, ResourceActionType.CREATE);
  let date = $state<Date | undefined>(initialDate);
  let goalId = $state<IRecordId | undefined>(initialGoalId);
  let label = $state("");
  let inputRef = $state<TextInput | undefined>(undefined);
  let isShowGoalPicker = $state(false);
  let goalSearchQuery = $state("");
  let goalSearchInput = $state<TextSearchInput | undefined>(undefined);
  let searchStore = new SearchStore(Resource.goal);
  let goal = $state<IGoal | undefined>(undefined);
  let isFocusing = $state(false);
  let isCreateInProgress = $state(false);
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

  function handleKeydown(keyboardEvent: KeyboardEvent) {
    if (keyboardEvent.key === "ArrowDown") {
      keyboardEvent.preventDefault();
      isShowGoalPicker = true;
      setTimeout(() => {
        goalSearchInput?.focus();
        goalSearchInput?.showDefaultResults();
      }, 0);
    }
  }

  function handleKeydownFromGoalSearch(keyboardEvent: KeyboardEvent) {
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

  function emitClose() {
    const closeEvent = new CustomEvent<void>("close");
    onClose?.(closeEvent);
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
          emitClose();
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
        onMount={() => {
          inputRef?.focus();
        }}
        onFocus={() => (isFocusing = true)}
        onBlur={() => (isFocusing = false)}
        onKeydown={(event) => handleKeydown(event.detail.event ?? event.detail)}
        placeholder="Enter task name"
        testId="task-name-input"
        style={InputStyle.PLAIN}
        onEnter={handleCreateOnEnter}
      />
    </div>
    <div class="flex items-center gap-1">
      <Button
        icon="save"
        onclick={handleCreate}
        size={Size.sm}
        tooltip="Create task"
        shortcut={GlobalEvent.ENTER}
      />
      <Button icon="cross" onclick={emitClose} size={Size.sm} />
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
          onKeydown={handleKeydownFromGoalSearch}
          placeholder="Search to assign a goal"
          onSelect={(e) => {
            goal = e.detail.item;
            isShowGoalPicker = false;
          }}
          style={InputStyle.PLAIN}
        />
        <Button
          icon="cross"
          size={Size.sm}
          onclick={() => (isShowGoalPicker = false)}
        />
      </div>
    {:else if goal}
      <div class="min-w-0 flex-1 transition-all duration-200">
        <TaskThumbnailGoalLabel
          goal={resolveGoalThumb(goal)}
          onClearGoal={() => {
            isShowGoalPicker = true;
            goal = undefined;
          }}
          accessPoint={ResourceAccessPoint.CAPTURE}
        />
      </div>
    {/if}
    <div class="flex gap-2 items-center">
      {#if !isShowGoalPicker && !goal && ($appStore.product === Product.POINTRON || $appStore.product === Product.NUCLEUM)}
        <Button
          label="Assign goal"
          size={Size.xs}
          style={ButtonStyle.OUTLINED}
          onclick={() => (isShowGoalPicker = true)}
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
