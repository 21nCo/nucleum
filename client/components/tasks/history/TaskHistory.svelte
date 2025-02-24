<script lang="ts">
  import type { IActiveTaskStore } from "$lib/client/components/tasks/task.store";
  import ComingSoonView from "$lib/client/elements/ComingSoonView.svelte";
  import OptionSelector from "$lib/client/elements/select/OptionSelector.svelte";
  import SwitchInput from "$lib/client/elements/toggle/SwitchInput.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import TaskFocusSessions from "./TaskFocusSessions.svelte";
  export let task: IActiveTaskStore;
  let selectedOption = "focus";
  let isIncludeSubTasks = false;
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
          label: "Activity",
          icon: "ph:clock-light",
          value: "activity"
        }
      ]}
      size={Size.sm}
      bind:selected={selectedOption}
    />
    {#if selectedOption === "focus"}
      <SwitchInput
        label={{ label: "Include sub tasks" }}
        size={Size.sm}
        bind:checked={isIncludeSubTasks}
      />
    {/if}
  </div>
  {#if selectedOption === "focus"}
    {#key isIncludeSubTasks}
      <TaskFocusSessions id={$task.id} {isIncludeSubTasks} />
    {/key}
  {:else if selectedOption === "activity"}
    <ComingSoonView />
    <!-- TODO -->
  {/if}
</div>
