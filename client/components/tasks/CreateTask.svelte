<script lang="ts">
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import Icon from "@21n/elements/Icon.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
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
  import ModalFooter from "@21n/components/modal/ModalFooter.svelte";
  import { SearchStore } from "@21n/components/record/record.store";
  import { taskStore } from "@21n/components/tasks/task.store";
  import { goalStore } from "@21n/components/goals/goal.store";
  import TaskThumbnailGoalLabel from "@21n/components/tasks/TaskThumbnailGoalLabel.svelte";
  import { Product } from "@21n/products/product.type";
  import { appStore } from "@21n/stores/app.store";
  import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
  import ShortcutText from "@21n/elements/text/ShortcutText.svelte";
  import { ModifierKey } from "@21n/types/keyboard.type";
  import { toasts } from "@21n/stores/notification.store";
  import context from "@21n/stores/context.store";
  import { Embed } from "@21n/types/context.type";
  import GoalSearchResultItem from "@21n/components/goals/GoalSearchResultItem.svelte";
  import ModalContentPadded from "@21n/components/modal/ModalContentPadded.svelte";

  let {
    date: initialDate = undefined,
    goalId: initialGoalId = undefined
  }: {
    date?: Date | undefined;
    goalId?: IRecordId | undefined;
  } = $props();

  const action = resourceAction(Resource.task, ResourceActionType.CREATE);
  let date = $state<Date | undefined>(initialDate);
  let goalId = $state<IRecordId | undefined>(initialGoalId);
  let label = $state("");
  let inputRef = $state<TextInput | undefined>(undefined);
  let isShowGoalPicker = $state(
    $appStore.product === Product.POINTRON ||
    $appStore.product === Product.NUCLEUM
  );
  let goalSearchQuery = $state("");
  let goalSearchInput = $state<TextSearchInput | undefined>(undefined);
  let searchStore = new SearchStore(Resource.goal);
  let goal = $state<IGoal | undefined>(undefined);

  onMount(async () => {
    if (goalId) {
      goal = await goalStore.select(goalId);
      isShowGoalPicker = false;
    }
  });

  async function handleCreate(event?: any) {
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
      if (event instanceof KeyboardEvent && event.shiftKey === true) {
        toasts.success("Task created successfully");
        label = "";
        isShowGoalPicker = true;
        goalId = undefined;
        goal = undefined;
        return;
      }
    }
    return result;
  }

  async function handleCreateOnEnter(e: any) {
    const result = await handleCreate(e.detail.event);
    if (result) modalEvent.hide(action);
  }

  function resolveGoalThumb(goal: IGoal) {
    return goal as unknown as IGoalThumb;
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
  class="cw:w-full w-[32rem] h-auto min-h-[16rem] flex flex-col justify-between gap-4 rounded-lg bg-bgs1"
>
  <ModalContentPadded class="flex flex-col gap-3">
    {#if isShowGoalPicker}
      <div class="transition-all duration-200">
        <TextSearchInput
          bind:value={goalSearchQuery}
          bind:this={goalSearchInput}
          searchCallback={searchGoalCallback}
          searchResultComponent={GoalSearchResultItem}
          placeholder="Assign to a goal"
          onSelect={(e) => {
            goal = e.detail.item;
            isShowGoalPicker = false;
          }}
          style={InputStyle.PLAIN}
        />
      </div>
    {:else if goal}
      <div class="transition-all duration-200">
        <TaskThumbnailGoalLabel
          goal={resolveGoalThumb(goal)}
          onClearGoal={() => {
            isShowGoalPicker = true;
          }}
          accessPoint={ResourceAccessPoint.CAPTURE}
        />
      </div>
    {/if}
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <TextInput
          bind:value={label}
          bind:this={inputRef}
          size={Size.lg}
          onMount={() => {
            inputRef?.focus();
          }}
          placeholder="Enter task name"
          testId="task-name-input"
          style={InputStyle.PLAIN}
          onEnter={handleCreateOnEnter}
        />
      </div>
      <span class="flex items-center shrink-0">
        <DatePicker
          bind:date
          style={InputStyle.PLAIN}
          variant={date ? "inline-with-icon" : "icon-only"}
        />
      </span>
    </div>
  </ModalContentPadded>
  <div class="flex flex-col gap-3 mt-2">
    {#if $context.embed !== Embed.HANDSET}
      <div class="text-b3 text-fgs3 flex gap-1 justify-center py-1">
        <span>Press</span>
        <ShortcutText
          parentBgIndex={1}
          isAlwaysShown={true}
          shortcut={{
            key: "Enter",
            modifiers: [ModifierKey.SHIFT]
          }}
        />
        <span>to save this task and create another</span>
      </div>
    {/if}
    <ModalFooter
      {action}
      size={Size.sm}
      primaryAction={{
        label: "Create",
        icon: "proceed",
        callback: handleCreate
      }}
      secondaryAction={{
        label: "Cancel",
        icon: "cross"
      }}
    />
  </div>
</div>
