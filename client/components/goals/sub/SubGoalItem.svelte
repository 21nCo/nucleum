<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  import TextInput from "@21n/elements/input/TextInput.svelte";
  import { InputStyle } from "@21n/types/input.type";
  import { Size } from "@21n/types/size.enum";
  import { cn } from "@21n/utils/ui.utils";
  import { SubGoalsLayout, GoalStatus, type IGoal } from "@21n/components/goals/goal.type";
  import { createEventDispatcher } from "svelte";
  import StepMarker from "@21n/components/goals/sub/StepMarker.svelte";
  import { parseAndFormatDate } from "@21n/utils/time.utils";

  type IAddSubGoalItem = { label?: string; type: "add" };

  export let subGoal: IGoal | IAddSubGoalItem;
  export let index: number;
  export let totalLength: number;
  export let method: SubGoalsLayout = SubGoalsLayout.DEFAULT;
  let newSubGoalLabel = "";
  const dispatch = createEventDispatcher();

  function isSavedSubGoal(subGoal: IGoal | IAddSubGoalItem): subGoal is IGoal {
    return "id" in subGoal;
  }

  $: stepMarkerItem = isSavedSubGoal(subGoal)
    ? subGoal
    : { ...subGoal, status: GoalStatus.NOT_STARTED };

  function onSave() {
    dispatch("add", { label: newSubGoalLabel });
    newSubGoalLabel = "";
  }
</script>

{#if method === SubGoalsLayout.STEPS}
  <button
    class={cn(
      "flex group items-center gap-4 relative border border-transparent rounded-md p-1",
      {
        "hover:border-ccs2 hover:bg-ccs3": subGoal.label
      }
    )}
    on:click
    data-id={isSavedSubGoal(subGoal) ? subGoal.id : undefined}
    data-index={index}
    data-type={subGoal.type}
    draggable={true}
  >
    <StepMarker item={stepMarkerItem} {index} {totalLength} />
    {#if subGoal.label}
      <div
        class={cn("text-left flex-1 py-1.5 group-hover:text-ccs1", {
          "line-through":
            isSavedSubGoal(subGoal) &&
            subGoal.status === GoalStatus.COMPLETED
        })}
      >
        {subGoal.label ? subGoal.label : "Untitled"}
      </div>
      {#if isSavedSubGoal(subGoal) && subGoal.startDate && subGoal.endDate}
        <div class="text-b3 text-fgs3">
          {parseAndFormatDate(new Date(subGoal.startDate))} -
          {parseAndFormatDate(new Date(subGoal.endDate))}
        </div>
      {/if}
    {:else}
      <TextInput
        bind:value={newSubGoalLabel}
        placeholder="Add a subgoal"
        style={InputStyle.PLAIN}
        isShowSaveControl={newSubGoalLabel !== ""}
        on:enter={onSave}
        on:cancel={() => (newSubGoalLabel = "")}
        on:save={onSave}
      />
    {/if}
  </button>
{:else}
  <button
    class="flex items-center group gap-4 p-2 border border-transparent hover:border-aps2 rounded-md"
    on:click
  >
    {#if subGoal.label}
      <div class="text-left flex-1 group-hover:text-aps1">
        {subGoal.label}
      </div>
    {:else}
      <TextInput
        bind:value={newSubGoalLabel}
        placeholder="Add a subgoal"
        style={InputStyle.PLAIN}
        isShowSaveControl={newSubGoalLabel !== ""}
        on:enter={onSave}
        on:save={onSave}
        on:cancel={() => (newSubGoalLabel = "")}
      />
    {/if}
  </button>
{/if}
