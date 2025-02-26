<script lang="ts">
  import Icon from "$lib/client/elements/Icon.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { Size } from "$lib/client/types/size.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import { SubGoalsLayout, GoalStatus, type IGoal } from "../goal.type";
  import { createEventDispatcher } from "svelte";
  import StepMarker from "./StepMarker.svelte";
  export let subGoal: IGoal | { label?: string; type: string };
  export let index: number;
  export let totalLength: number;
  export let method: SubGoalsLayout = SubGoalsLayout.DEFAULT;
  let newSubGoalLabel = "";
  const dispatch = createEventDispatcher();

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
        "hover:border-aps2 hover:bg-aps3": subGoal.label
      }
    )}
    on:click
    data-id={subGoal.id}
    data-index={index}
    data-type={subGoal.type}
    draggable={true}
  >
    <StepMarker item={subGoal} {index} {totalLength} />
    {#if subGoal.label}
      <div
        class={cn("text-left flex-1 py-1.5 group-hover:text-aps1", {
          "line-through": subGoal.status === GoalStatus.COMPLETED
        })}
      >
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
      />
    {/if}
  </button>
{/if}
