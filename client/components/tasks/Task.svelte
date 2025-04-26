<script lang="ts">
  import type { IRecordId } from "$lib/client/types/data.type";
  import { onMount } from "svelte";
  import {
    ResourceAccessMode,
    ResourceAccessPoint
  } from "../flux/resourceStores/resource.type";
  import { taskStore } from "./task.store";
  import type { ITaskThumb } from "./task.type";

  import TaskThumbnail from "./TaskThumbnail.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import { recentsStore } from "../record/recent.store";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import { Orientation } from "$lib/client/types/direction.enum";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { InputStyle } from "$lib/client/types/input.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import TaskCheckbox from "./TaskCheckbox.svelte";
  import { ButtonStyle, ButtonVariant } from "$lib/client/types/button.type";
  import { appStore } from "$lib/client/stores/app.store";
  import InlineFeedbackText from "$lib/client/extensions/clipper/InlineFeedbackText.svelte";
  import {
    AlertType,
    type IInlineStatus
  } from "$lib/client/types/notification.type";
  import TaskThumbnailGoalLabel from "./TaskThumbnailGoalLabel.svelte";
  import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import type { IGoal } from "../goals/goal.type";
  import { SearchStore } from "../record/record.store";
  import { Product } from "$lib/client/types/product.type";
  import { goalStore } from "../goals/goal.store";

  export let id: IRecordId;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  let isRefreshing = false;
  let status: IInlineStatus | undefined = undefined;
  let task: ITaskThumb | undefined = undefined;
  let date: Date | undefined = undefined;
  let completedDate: Date | undefined = undefined;
  let inputRef: TextInput | undefined = undefined;
  let isShowGoalPicker =
    $appStore.product === Product.POINTRON ||
    $appStore.product === Product.NUCLEUS;
  let goalSearchQuery = "";
  let goalSearchInput: TextSearchInput | undefined = undefined;
  let goal: IGoal | undefined = undefined;
  const searchStore = new SearchStore(Resource.goal);
  onMount(async () => {
    await refresh();
  });
  async function refresh() {
    isRefreshing = true;
    const result = await taskStore.selectMany(
      {
        filters: {
          id: id?.toString()
        }
      },
      {
        isExpand: true
      }
    );
    if (isValidArrayWithData(result)) {
      task = result[0];
      if (!task) return;
      if (task.dateUnix) date = new Date(task.dateUnix);
      if (task.completedAtUnix) completedDate = new Date(task.completedAtUnix);
      if (task.goalId) {
        goal = await goalStore.select(task.goalId as IRecordId);
        isShowGoalPicker = false;
      }
      recentsStore.add(task, {
        type: Resource.task,
        timestamp: new Date()
      });
    }
    isRefreshing = false;
  }

  async function handleLabelChange(e: CustomEvent) {
    status = {
      message: "Updating task name...",
      type: AlertType.PROGRESS
    };
    const result = await taskStore.modify(
      id,
      { label: e.detail },
      { context: accessPoint }
    );
    if (result) {
      status = {
        message: "Task name updated",
        type: AlertType.SUCCESS
      };
    } else {
      status = {
        message: "Failed to update task name. Please try again.",
        type: AlertType.ERROR
      };
    }
  }
  async function onDateChange(e: CustomEvent<Date>) {
    const val = e.detail;
    if (!task) return;
    status = {
      message: "Updating due date...",
      type: AlertType.PROGRESS
    };
    task.dateUnix = resolveUnixTimestamp(val);
    const result = await taskStore.modify(
      task.id,
      { dateUnix: task.dateUnix },
      {
        context: accessPoint
      }
    );
    if (result) {
      status = {
        message: "Due date updated",
        type: AlertType.SUCCESS
      };
    } else {
      status = {
        message: "Failed to save date. Please try again.",
        type: AlertType.ERROR
      };
    }
  }
  async function onCompletedDateChange(e: CustomEvent<Date>) {
    const val = e.detail;
    if (!task) return;
    task.completedAtUnix = resolveUnixTimestamp(val);
    const result = await taskStore.modify(
      task.id,
      { completedAtUnix: task.completedAtUnix },
      { context: accessPoint }
    );
    if (result) {
      status = {
        message: "Completed date updated",
        type: AlertType.SUCCESS
      };
    } else {
      status = {
        message: "Failed to update completed date. Please try again.",
        type: AlertType.ERROR
      };
    }
  }

  function goalSearchGoalCallback(query: string) {
    return searchStore.select({
      searchQuery: query,
      limit: 30
    });
  }

  async function onGoalSelect(e: CustomEvent<{ item: IGoal }>) {
    goal = e.detail.item;
    isShowGoalPicker = false;
    if (!task) return;
    status = {
      message: "Updating goal...",
      type: AlertType.PROGRESS
    };
    task.goalId = goal.id;
    const result = await taskStore.modify(
      task.id,
      { goalId: goal.id },
      { context: accessPoint }
    );
    if (result) {
      status = {
        message: "Goal updated",
        type: AlertType.SUCCESS
      };
    } else {
      status = {
        message: "Failed to update goal. Please try again.",
        type: AlertType.ERROR
      };
    }
  }

  async function onGoalClear() {
    if (!task) return;
    status = {
      message: "Clearing goal...",
      type: AlertType.PROGRESS
    };
    const result = await taskStore.modify(
      task.id,
      { goalId: undefined },
      { context: accessPoint }
    );
    if (result) {
      goal = undefined;
      task.goalId = undefined;
      isShowGoalPicker = true;
      status = {
        message: "Goal cleared",
        type: AlertType.SUCCESS
      };
    } else {
      status = {
        message: "Failed to clear goal. Please try again.",
        type: AlertType.ERROR
      };
    }
  }
</script>

<div class="flex p-4 mo:w-full w-[32rem] h-[28rem]">
  {#if isRefreshing}
    <EmptyStatusView isLoadingState={isRefreshing} />
  {:else if task}
    <div
      class="w-full flex flex-col justify-between gap-4 h-full userdata ph-no-capture"
    >
      <div class="flex flex-col gap-6 mt-4">
        <div class="flex flex-col gap-1">
          {#if isShowGoalPicker}
            <TextSearchInput
              bind:value={goalSearchQuery}
              bind:this={goalSearchInput}
              searchCallback={goalSearchGoalCallback}
              placeholder="Assign to a goal"
              icon="ph:plus-light"
              on:select={onGoalSelect}
              style={InputStyle.PLAIN}
            />
          {:else if goal}
            <TaskThumbnailGoalLabel
              {goal}
              on:click={onGoalClear}
              isCreateContext={true}
            />
          {/if}
          <div class="flex gap-2">
            <TaskCheckbox
              id={task.id}
              bind:isChecked={task.isChecked}
              size={Size.lg}
              {accessPoint}
            />
            <TextInput
              bind:value={task.label}
              bind:this={inputRef}
              size={Size.lg}
              on:mount={() => {
                inputRef?.focus();
              }}
              placeholder="Enter task name"
              style={InputStyle.PLAIN}
              on:debouncedChange={handleLabelChange}
            />
          </div>
        </div>

        <div class="flex gap-2">
          <DatePicker
            bind:date
            placeholder="Set due date"
            label={{ label: "Due date", orientation: Orientation.Vertical }}
            on:change={onDateChange}
          />
          {#if task.isChecked}
            <DatePicker
              bind:date={completedDate}
              placeholder="Set completed date"
              label={{
                label: "Completed date",
                orientation: Orientation.Vertical
              }}
              on:change={onCompletedDateChange}
            />
          {/if}
        </div>
      </div>

      <div class="flex flex-col gap-3 justify-center w-full">
        <InlineFeedbackText feedback={status} />
        <div class="flex gap-2 justify-center w-full">
          <Button
            icon="ph:trash-light"
            label="Delete"
            style={ButtonStyle.OUTLINED}
            type={ButtonVariant.DANGER}
          />
          <Button
            icon="ph:x-circle-light"
            label="Close"
            on:click={() => {
              appStore.closeResource({
                accessMode: ResourceAccessMode.POP
              });
            }}
          />
        </div>
      </div>
    </div>
  {/if}
</div>
