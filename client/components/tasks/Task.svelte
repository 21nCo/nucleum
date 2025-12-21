<script lang="ts">
  import type { IRecordId } from "@21n/types/data.type";
  import { onMount } from "svelte";
  import {
    AccessMode,
    ResourceAccessPoint
  } from "@21n/components/flux/resourceStores/resource.type";
  import { taskStore } from "@21n/components/tasks/task.store";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { recentsStore } from "@21n/components/record/recent.store";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import DatePicker from "@21n/elements/datetime/DatePicker.svelte";
  import { Orientation } from "@21n/types/direction.enum";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { Size } from "@21n/types/size.enum";
  import { InputStyle } from "@21n/types/input.type";
  import Button from "@21n/elements/button/Button.svelte";
  import TaskCheckbox from "@21n/components/tasks/TaskCheckbox.svelte";
  import { ButtonStyle, ButtonVariant } from "@21n/types/button.type";
  import { appStore } from "@21n/stores/app.store";
  import InlineFeedbackText from "@21n/extensions/clipper/InlineFeedbackText.svelte";
  import { AlertType, type IInlineStatus } from "@21n/types/notification.type";
  import TaskThumbnailGoalLabel from "@21n/components/tasks/TaskThumbnailGoalLabel.svelte";
  import { resolveUnixTimestamp } from "@21n/shared-utils/time.utils";
  import TextSearchInput from "@21n/elements/input/TextSearchInput.svelte";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import { SearchStore } from "@21n/components/record/record.store";
  import { Product } from "@21n/products/product.type";
  import { goalStore } from "@21n/components/goals/goal.store";
  import {
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import Icon from "@21n/elements/Icon.svelte";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import RecordTrashBanner from "@21n/components/record/RecordTrashBanner.svelte";
  import { cn } from "@21n/utils/ui.utils";
  import view from "@21n/stores/view.store";

  export let id: IRecordId;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.SELF;
  export let accessMode: AccessMode = AccessMode.POP;
  export let accessPointId: IRecordId | undefined = undefined;
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
  let goal: IGoalThumb | undefined = undefined;
  const searchStore = new SearchStore(Resource.goal);

  $: isCurrentlyFocusing = activeSession.isCurrentFocusItem(
    id,
    $currentFocusItem
  );

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
      if (task.goalId && !task.goal) {
        const result = await goalStore.selectMany(
          {
            filters: {
              id: task.goalId as IRecordId
            }
          },
          {
            isExpand: true
          }
        );
        if (isValidArrayWithData(result)) {
          goal = result[0];
        }
        isShowGoalPicker = false;
      } else if (task.goal) {
        goal = task.goal;
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

  async function onGoalSelect(e: CustomEvent<{ item: IGoalThumb }>) {
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

  function onClose() {
    if (accessPoint === ResourceAccessPoint.GOAL) {
      if (accessPointId)
        appStore.toggleSearchParamRecordSpecific(accessPointId, ["task"]);
    } else {
      appStore.closeResource({
        accessMode: accessMode
      });
    }
  }
</script>

<div
  class={cn(
    "flex p-4 cw:w-full portrait:w-full cw:h-full otop:pt-12 h-[28rem]",
    {
      "landscape:w-[32rem]": accessMode !== AccessMode.INLINE,
      "w-full": accessMode === AccessMode.INLINE,
      "w-full min-h-[28rem]": accessMode === AccessMode.SHEET
    }
  )}
>
  {#if isRefreshing}
    <EmptyStatusView isLoadingState={isRefreshing} />
  {:else if task}
    <div
      class="w-full flex flex-col justify-between gap-4 h-full userdata ph-no-capture"
    >
      <div class="flex flex-col gap-6 mt-4">
        {#if $view.isConstrainedWidth}
          <div class="flex justify-end w-full">
            <Button
              icon="cross"
              style={ButtonStyle.OUTLINED}
              on:click={onClose}
            />
          </div>
        {/if}
        <div class="flex flex-col gap-1">
          {#if isShowGoalPicker}
            <TextSearchInput
              bind:value={goalSearchQuery}
              searchCallback={goalSearchGoalCallback}
              placeholder="Search to assign a goal"
              icon="plus"
              on:select={onGoalSelect}
              style={InputStyle.PLAIN}
            />
          {:else if goal}
            <TaskThumbnailGoalLabel
              {goal}
              on:clearGoal={onGoalClear}
              {accessPoint}
            />
          {/if}
          <div class="flex gap-2">
            <TaskCheckbox
              id={task.id}
              bind:isChecked={task.isChecked}
              size={Size.lg}
              {accessPoint}
              on:toggle={() => {
                if (task?.isChecked) {
                  completedDate = new Date();
                }
              }}
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
        {#if isCurrentlyFocusing}
          <button
            on:click={() => {
              appStore.gotoPath(PointronAction.FOCUS);
            }}
            class="flex items-center gap-1 text-b3 text-aps1"
          >
            <Icon icon="hourglass" size={Size.sm} class="text-aps1" />
            <span> Currently focusing... </span>
          </button>
        {/if}
        {#if task.trashInformation}
          <RecordTrashBanner
            deletedAt={task.trashInformation.deletedAt}
            on:restore={() => {
              taskStore.restore(id, {
                context: accessPoint
              });
            }}
          />
        {/if}
      </div>
      <div class="flex flex-col gap-3 justify-center w-full">
        <InlineFeedbackText feedback={status} />
        <div class="flex gap-2 justify-center w-full cw:pb-6">
          <Button
            icon="trash"
            label="Delete"
            style={ButtonStyle.OUTLINED}
            type={ButtonVariant.DANGER}
            on:click={() => {
              taskStore.trash(id, {
                context: accessPoint
              });
              appStore.closeResource({
                accessMode: accessMode
              });
            }}
          />
          {#if !$view.isConstrainedWidth}
            <Button icon="x-circle" label="Close" on:click={onClose} />
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
