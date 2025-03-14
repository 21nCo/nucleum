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
  import { ResourceActionType } from "../flux/resourceStores/resource.type";
  import { resourceAction } from "../flux/resourceStores/resource.utils";
  import type { IGoal } from "../goals/goal.type";
  import modalEvent from "../modal/modal.store";
  import ModalFooter from "../modal/ModalFooter.svelte";
  import { SearchStore } from "../record/record.store";
  import { taskStore } from "./task.store";
  import { goalStore } from "../goals/goal.store";
  import TaskThumbnailGoalLabel from "./TaskThumbnailGoalLabel.svelte";

  export let date: Date | undefined = undefined;
  export let goalId: IRecordId | undefined = undefined;
  const action = resourceAction(Resource.task, ResourceActionType.CREATE);
  let label = "";
  let inputRef: TextInput | undefined;
  let isShowGoalPicker = true;
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

  async function handleCreate() {
    return taskStore.save(
      {
        label,
        date,
        goalId: goalId ?? goal?.id,
        isChecked: false
      },
      {
        context: action
      }
    );
  }

  async function handleCreateOnEnter() {
    await handleCreate();
    modalEvent.hide(action);
  }

  function searchGoalCallback(query: string) {
    return searchStore.select({
      searchQuery: query,
      limit: 30
    });
  }
</script>

<div class="w-96 h-40 flex flex-col justify-between gap-2">
  {#if isShowGoalPicker}
    <TextSearchInput
      bind:value={goalSearchQuery}
      bind:this={goalSearchInput}
      searchCallback={searchGoalCallback}
      placeholder="Assign to a goal"
      icon="ph:plus-light"
      on:select={(e) => {
        goal = e.detail.item;
        isShowGoalPicker = false;
      }}
      style={InputStyle.PLAIN}
    />
  {:else if goal}
    <TaskThumbnailGoalLabel
      {goal}
      on:click={() => {
        isShowGoalPicker = true;
      }}
      isCreateContext={true}
    />
  {/if}
  <div class="flex items-center gap-2">
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
    <span class="flex items-center gap-1 whitespace-nowrap">
      <DatePicker
        bind:date
        style={InputStyle.PLAIN}
        variant={date ? "inline-with-icon" : "icon-only"}
      />
    </span>
  </div>

  <ModalFooter
    {action}
    primaryAction={{
      label: "Create",
      icon: "ph:arrow-right-light",
      callback: handleCreate
    }}
    secondaryAction={{
      label: "Cancel",
      icon: "ph:x-light"
    }}
  />
</div>
