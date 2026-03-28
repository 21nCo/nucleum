<script lang="ts">
  import type { IActiveGoalStore } from "@21n/components/goals/goal.store";
  import ComingSoonView from "@21n/elements/ComingSoonView.svelte";
  import OptionSelector from "@21n/elements/select/OptionSelector.svelte";
  import SwitchInput from "@21n/elements/toggle/SwitchInput.svelte";
  import { Size } from "@21n/types/size.enum";
  import GoalAllActivityPanel from "@21n/components/goals/history/GoalAllActivityPanel.svelte";
  import GoalFocusSessions from "@21n/components/goals/history/GoalFocusSessions.svelte";
  export let goal: IActiveGoalStore;
  let selectedOption = "all";
  let isIncludeSubGoals = false;
</script>

<div class="flex flex-col w-full h-full gap-2 overflow-auto">
  <div class="flex w-full gap-4 justify-between px-4">
    <OptionSelector
      options={[
        {
          label: "All",
          icon: "asterisk",
          value: "all"
        },
        {
          label: "Focus sessions",
          icon: "circle",
          value: "focus"
        }
      ]}
      size={Size.sm}
      bind:selected={selectedOption}
    />
    {#if selectedOption === "focus"}
      <SwitchInput
        label={{ label: "Include sub goals" }}
        size={Size.sm}
        bind:checked={isIncludeSubGoals}
      />
    {/if}
  </div>
  {#if selectedOption === "focus"}
    {#key isIncludeSubGoals}
      <GoalFocusSessions id={$goal.id} {isIncludeSubGoals} />
    {/key}
  {:else if selectedOption === "all"}
    <GoalAllActivityPanel
      goalId={$goal.id}
      createdAt={$goal.createdAt.toISOString()}
    />
  {/if}
</div>
