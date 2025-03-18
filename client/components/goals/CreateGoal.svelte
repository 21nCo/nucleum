<script lang="ts">
  import Button from "$lib/client/elements/button/Button.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import { ButtonStyle } from "$lib/client/types/button.type";
  import { Orientation } from "$lib/client/types/direction.enum";
  import { OptionSelectorStyle } from "$lib/client/types/select.type";
  import { Size } from "$lib/client/types/size.enum";
  import { Resource } from "../flux/resourceStores/resource.enum";
  import {
    ResourceAccessPoint,
    ResourceActionType,
    type OmitForCapture
  } from "../flux/resourceStores/resource.type";
  import {
    resourceAction,
    shiftResourceInArray
  } from "../flux/resourceStores/resource.utils";
  import Markdown from "../markdown/Markdown.svelte";
  import type { IMarkdown } from "../markdown/md.type";
  import ModalFooter from "../modal/ModalFooter.svelte";
  import { goalStore } from "./goal.store";
  import { toasts } from "$lib/client/stores/notification.store";
  import { SubGoalsLayout, GoalType, type IGoal } from "./goal.type";
  import { resolveGoalSubTypesForSwitcher } from "./goal.utils";
  import StepMarker from "./sub/StepMarker.svelte";
  import SubGoalsLayoutSwitcher from "./sub/SubGoalsLayoutSwitcher.svelte";
  import {
    reorderList,
    type DragDropEvent
  } from "$lib/client/actions/rearrange.action";
  import GoalColorPickerWithPreview from "$lib/client/products/pointron/goals/GoalColorPickerWithPreview.svelte";
  import { isValidString } from "$lib/shared/utils/text.utils";
  import TimeRangePicker from "$lib/client/elements/datetime/TimeRangePicker.svelte";
  import TimeSpan from "$lib/client/elements/datetime/TimeSpan.svelte";
  import { TimeScale } from "$lib/client/types/time.type";
  import {
    activeScales,
    resolveDefaultSpanScale
  } from "$lib/client/elements/datetime/datetime.utils";
  import DropDown from "$lib/client/elements/dropdown/DropDown.svelte";
  import ColorPickerMini from "$lib/client/elements/colorPicker/ColorPickerMini.svelte";
  export let context: ResourceAccessPoint | undefined = undefined;

  let label: string = "";
  let type: GoalType = GoalType.INDEFINITE;
  let color: number | undefined = undefined;
  let description: IMarkdown | undefined = undefined;
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  let spanScale: TimeScale | undefined;
  let isDescriptionVisible: boolean = false;
  let isSubGoalsVisible: boolean = false;
  let isCollectionSelectorVisible: boolean = false;
  let subGoals: string[] = [];
  let newSubGoal: string = "";
  let subGoalsLayout: SubGoalsLayout = SubGoalsLayout.DEFAULT;
  let parent: IGoal | undefined;
  async function handleCreate() {
    try {
      if (!label) {
        toasts.error("Goal name is required");
        return;
      }

      if (type === GoalType.DEFINITE && !spanScale && startDate && endDate) {
        spanScale = resolveDefaultSpanScale(startDate, endDate, activeScales);
      }
      const goal: OmitForCapture<IGoal> = {
        label,
        type,
        subGoalsLayout: subGoalsLayout,
        description: isDescriptionVisible ? description : undefined,
        startDate: type === GoalType.DEFINITE ? startDate : undefined,
        endDate: type === GoalType.DEFINITE ? endDate : undefined,
        parent: parent ? [parent.id] : undefined,
        color,
        spanScale
      };

      const result = await goalStore.save(goal, {
        subGoals: subGoals,
        context:
          context ?? resourceAction(Resource.goal, ResourceActionType.CREATE)
      });
      toasts.success("Goal created successfully");
      return result;
    } catch (error) {
      console.error("Error creating goal:", error);
      toasts.error("Failed to create goal");
    }
  }

  function handleAddSubGoal() {
    if (newSubGoal) {
      subGoals = [...subGoals, newSubGoal];
    }
    newSubGoal = "";
  }

  function onReorderSubGoals(event: DragDropEvent) {
    const { fromId, toId } = event;
    if (!fromId || !toId || fromId === toId) return;
    subGoals = shiftResourceInArray(subGoals, fromId, toId);
  }

  function onDateChange(val: CustomEvent<{ start: Date; end: Date }>) {
    startDate = new Date(val.detail.start);
    endDate = new Date(val.detail.end);
  }
</script>

<div
  class="flex flex-col w-96 h-60 gap-4 items-center justify-between overflow-auto userdata"
>
  <div class="flex flex-col w-full gap-6">
    <!-- <LinkboxOnCapture /> -->
    <div class="flex gap-2 items-center w-full">
      <div class="flex-1">
        <TextInput bind:value={label} placeholder="Some goal name" />
      </div>
      <div>
        <ColorPickerMini bind:hue={color} />
      </div>
    </div>
    <!-- <OptionSelector
      labelProps={{
        label: "Type of the goal",
        orientation: Orientation.Vertical
      }}
      bind:selected={type}
      options={resolveGoalSubTypesForSwitcher()}
      size={Size.sm}
      style={OptionSelectorStyle.TRAIN}
    /> -->
    <DropDown
      items={resolveGoalSubTypesForSwitcher()}
      bind:value={type}
      isDisableSearch={true}
    />
    <!-- {#if !parent}
      <GoalColorPickerWithPreview
        hue={color}
        on:change={(e) => (color = e.detail)}
        label={isValidString(label) ? label : "Preview"}
      />
    {/if} -->
    {#if type === GoalType.DEFINITE}
      <TimeRangePicker
        label={{
          label: "Start and end date",
          orientation: Orientation.Vertical
        }}
        initialStartDate={startDate}
        initialEndDate={endDate}
        on:change={onDateChange}
      />
      {#if startDate && endDate}
        <TimeSpan
          scales={activeScales}
          start={startDate}
          end={endDate}
          bind:spanScale
        />
      {/if}
    {/if}
    {#if isDescriptionVisible}
      <div class="flex flex-col gap-4 bg-bgs2 rounded-md p-4">
        <span class="text-b2 font-medium text-fgs2">Description</span>
        <Markdown bind:md={description} />
      </div>
    {/if}
    {#if isSubGoalsVisible}
      <div class="flex flex-col gap-4 bg--bgs2 rounded-md p-4">
        <span class="text-b2 font-medium text-fgs2">Sub goals</span>
        <div class="flex items-center justify-end gap-2 w-full">
          <SubGoalsLayoutSwitcher bind:layout={subGoalsLayout} />
        </div>
        <div
          use:reorderList={{
            listId: "subGoals",
            draggedOverClass: "!border-aps1 rounded-md",
            onDrop: onReorderSubGoals,
            dragImage: "dragimage"
          }}
          class="flex flex-col gap-4"
        >
          {#each subGoals as goal, index (goal)}
            <div
              class="flex items-center gap-2 border border-transparent rounded-md"
              data-id={goal}
              data-index={index}
              draggable={true}
            >
              {#if subGoalsLayout === SubGoalsLayout.STEPS}
                <StepMarker
                  item={goal}
                  {index}
                  totalLength={subGoals.length + 1}
                  accessPoint={ResourceAccessPoint.FORM}
                />
              {/if}
              <TextInput
                bind:value={goal}
                placeholder="+ Sub goal name"
                isShowClearControl={true}
                on:cancel={() =>
                  (subGoals = subGoals.filter((t) => t !== goal))}
              />
            </div>
          {/each}
          <div class="flex items-center gap-2">
            {#if subGoalsLayout === SubGoalsLayout.STEPS}
              <StepMarker
                item={{ label: newSubGoal, type: "add" }}
                index={subGoals.length}
                totalLength={subGoals.length + 1}
              />
            {/if}
            <TextInput
              bind:value={newSubGoal}
              placeholder="Sub goal name"
              icon={subGoalsLayout === SubGoalsLayout.STEPS
                ? undefined
                : "ph:plus-light"}
              isShowSaveControl={newSubGoal !== ""}
              on:enter={handleAddSubGoal}
              on:save={handleAddSubGoal}
              on:cancel={() => (newSubGoal = "")}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="flex flex-col gap-4 w-full">
    <div class="flex gap-3 flex-wrap items-center mt-8">
      <!-- {#if !isDescriptionVisible}
        <Button
          label="Add description"
          icon="ph:text"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={() => (isDescriptionVisible = true)}
        />
      {/if}
      {#if !isSubGoalsVisible}
        <Button
          label="Add sub goals"
          icon="ph:tree-view-light"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={() => (isSubGoalsVisible = true)}
        />
      {/if} -->
      <!-- {#if !isCollectionSelectorVisible}
        <Button
          label="Add to a collection"
          icon="ph:plus-light"
          style={ButtonStyle.OUTLINED}
          size={Size.sm}
          on:click={() => (isCollectionSelectorVisible = true)}
        />
      {/if} -->
    </div>
    <ModalFooter
      action={resourceAction(Resource.goal, ResourceActionType.CREATE)}
      primaryAction={{
        label: "Create",
        icon: "ph:floppy-disk-light",
        callback: handleCreate
      }}
      secondaryAction={{
        label: "Cancel",
        icon: "ph:x-light"
      }}
    />
  </div>
</div>
