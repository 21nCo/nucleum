<script lang="ts">
  import { cn } from "$lib/client/utils/ui.utils";
  import { TaskStatus } from "../task.type";
  import TaskStatusSwitcherItem from "./TaskStatusSwitcherItem.svelte";
  import { createEventDispatcher } from "svelte";
  export let status: TaskStatus = TaskStatus.NOT_STARTED;
  export let variant: "spread" | "dropdown" = "spread";
  const dispatch = createEventDispatcher();
  $: if (!status) {
    status = TaskStatus.NOT_STARTED;
  }
</script>

{#if variant === "spread"}
  <div class="flex justify-between relative">
    <div
      class={cn("absolute top-1/2 left-0 right-0 border-t z-10", {
        "border-fgs4 border-dashed": status !== TaskStatus.COMPLETED,
        "border-aps1 border-2": status === TaskStatus.COMPLETED
      })}
    />
    {#if status === TaskStatus.IN_PROGRESS}
      <div
        class={cn(
          "absolute top-1/2 left-0 w-1/2 border-2 border-t border-aps1 z-10"
        )}
      />
    {/if}
    {#each Object.values(TaskStatus) as item}
      <TaskStatusSwitcherItem
        status={item}
        isActive={status === item}
        isAccent={status === TaskStatus.COMPLETED ||
          (status === TaskStatus.IN_PROGRESS &&
            item === TaskStatus.NOT_STARTED)}
        on:click={() => {
          status = item;
          dispatch("change", status);
        }}
      />
    {/each}
  </div>
{/if}
