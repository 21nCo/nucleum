<script lang="ts">
  import { hoverable } from "$lib/client/actions/hover.action";
  import Button from "$lib/client/elements/button/Button.svelte";
  import DatePicker from "$lib/client/elements/datetime/DatePicker.svelte";
  import TextInput from "$lib/client/elements/input/TextInput.svelte";
  import { InputStyle } from "$lib/client/types/input.type";
  import { formatDate } from "$lib/client/utils/time.utils";
  import { taskStore } from "./task.store";
  import type { ITask } from "./task.type";
  import TaskCheckbox from "./TaskCheckbox.svelte";
  export let task: ITask;
  let isHovering = false;
  let isDatePickerOpen = false;
</script>

<div
  class="flex gap-2 items-center px-4 py-2 h-12 bg-bgs2/50 hover:bg-bgs2 border border-brs2 rounded-md"
  use:hoverable={{
    onHover: (value) => {
      isHovering = value;
    }
  }}
>
  <TaskCheckbox id={task.id} bind:isChecked={task.isChecked} />
  {#if task.isChecked}
    <span class="line-through flex-1">
      {task.label}
    </span>
  {:else}
    <span class="flex-1">
      <TextInput bind:value={task.label} style={InputStyle.PLAIN} />
    </span>
  {/if}
  {#if task.date && !isHovering}
    <span class="text-b3 text-fgs3">
      {formatDate(task.date)}
    </span>
  {/if}
  {#if isHovering || isDatePickerOpen}
    <div class="flex gap-2">
      <DatePicker
        date={task.date}
        placeholder="Set date"
        on:change={(e) => {
          task.date = e.detail;
          taskStore.modify(task.id, { date: e.detail });
        }}
        on:opened={() => {
          isDatePickerOpen = true;
        }}
        on:closed={() => {
          isDatePickerOpen = false;
        }}
      />
      <Button icon="ph:trash" />
    </div>
  {/if}
</div>
