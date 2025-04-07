<script lang="ts">
  import type { IActiveGoalStore } from "$lib/client/components/goals/goal.store";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import GoalAllActivityPanel from "./GoalAllActivityPanel.svelte";
  import GoalFocusSessions from "./GoalFocusSessions.svelte";
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
          icon: "ph:asterisk-light",
          value: "all"
        },
        {
          label: "Focus sessions",
          icon: "ph:circle-light",
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
    <GoalAllActivityPanel goalId={$goal.id} createdAt={$goal.createdAt} />
  {/if}
</div>
