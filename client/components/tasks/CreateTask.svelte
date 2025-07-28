<script lang="ts">
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import TextSearchInput from "$lib/client/elements/input/TextSearchInput.svelte";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { onMount } from "svelte";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType
  } from "../flux/resourceStores/resource.type";
  import { resourceAction } from "../flux/resourceStores/resource.utils";
  import { GoalStatus, type IGoal } from "../goals/goal.type";
  import modalEvent from "../modal/modal.store";
  import ModalFooter from "../modal/ModalFooter.svelte";
  import { SearchStore } from "../record/record.store";
  import { taskStore } from "./task.store";
  import { goalStore } from "../goals/goal.store";
  import TaskThumbnailGoalLabel from "./TaskThumbnailGoalLabel.svelte";
  import { Product } from "$lib/client/types/product.type";
  import { appStore } from "$lib/client/stores/app.store";
  import { resolveUnixTimestamp } from "$lib/shared/utils/time.utils";
  import ShortcutText from "$lib/client/elements/text/ShortcutText.svelte";
  import { ModifierKey } from "$lib/client/types/keyboard.type";
  import { toasts } from "$lib/client/stores/notification.store";
  import context from "$lib/client/stores/context.store";
  import { Embed } from "$lib/client/types/context.type";
  import GoalSearchResultItem from "../goals/GoalSearchResultItem.svelte";
  export let date: Date | undefined = undefined;
  export let goalId: IRecordId | undefined = undefined;
  const action = resourceAction(Resource.task, ResourceActionType.CREATE);
  let label = "";
  let inputRef: TextInput | undefined;
  let isShowGoalPicker =
    $appStore.product === Product.POINTRON ||
    $appStore.product === Product.NUCLEUS;
  let goalSearchQuery = "";
  let goalSearchInput: TextSearchInput | undefined;
  let searchStore = new SearchStore(Resource.goal);
  let goal: IGoal | undefined = undefined;
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
  class="cw:w-full w-[32rem] h-auto min-h-[16rem] flex flex-col justify-between gap-4 p-4 rounded-lg bg-bgs1"
>
  <div class="flex flex-col gap-3">
    {#if isShowGoalPicker}
      <div class="transition-all duration-200">
        <TextSearchInput
          bind:value={goalSearchQuery}
          bind:this={goalSearchInput}
          searchCallback={searchGoalCallback}
          searchResultComponent={GoalSearchResultItem}
          placeholder="Assign to a goal"
          on:select={(e) => {
            goal = e.detail.item;
            isShowGoalPicker = false;
          }}
          style={InputStyle.PLAIN}
        />
      </div>
    {:else if goal}
      <div class="transition-all duration-200">
        <TaskThumbnailGoalLabel
          {goal}
          on:clearGoal={() => {
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
          on:mount={() => {
            inputRef?.focus();
          }}
          placeholder="Enter task name"
          style={InputStyle.PLAIN}
          on:enter={handleCreateOnEnter}
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
  </div>
  <div class="flex flex-col gap-3 mt-2">
    {#if $context.embed !== Embed.HANDSET}
      <div class="text-b3 text-fgs3 flex gap-1 justify-center py-1">
        <span>Press</span>
        <ShortcutText
          parentBgIndex={1}
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
      primaryAction={{
        label: "Create",
        icon: "arrow-right",
        callback: handleCreate,
        size: Size.sm
      }}
      secondaryAction={{
        label: "Cancel",
        icon: "cross",
        size: Size.sm
      }}
    />
  </div>
</div>
