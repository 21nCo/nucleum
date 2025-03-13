<script lang="ts">
  import type { IActiveGoalStore } from "$lib/client/components/goals/goal.store";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import GoalFocusSessions from "./GoalFocusSessions.svelte";
  export let goal: IActiveGoalStore;
  let selectedOption = "focus";
  let isIncludeSubGoals = false;
</script>

<div class="flex flex-col w-full h-full gap-2">
  <div class="flex w-full gap-4 justify-between px-4">
    <OptionSelector
      options={[
        {
          label: "Focus sessions",
          icon: "ph:circle-light",
          value: "focus"
        },
        {
          label: "All activity",
          icon: "ph:clock-counter-clockwise-light",
          value: "activity"
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
  {:else if selectedOption === "activity"}
    <ComingSoonView />
    <!-- TODO -->
  {/if}
</div>
