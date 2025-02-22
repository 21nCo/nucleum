<script lang="ts">
  import { type IActiveTaskStore } from "$lib/client/components/tasks/task.store";
  import TaskCollectionsRow from "../TaskCollectionsRow.svelte";
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import TaskTitleRow from "./TaskTitleRow.svelte";
  import TaskStatusSwitcher from "../status/TaskStatusSwitcher.svelte";
  import { TaskStatus, TaskType } from "../task.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import TimelineCard from "./TimelineCard.svelte";
  export let task: IActiveTaskStore;
  export let isConstrainedWidth = false;
  function handleStatusChange(e: CustomEvent<TaskStatus>) {
    $task.status = e.detail;
    task.modify({
      status: e.detail
    });
  }
</script>

<div
  class={cn("flex flex-col gap-6", {
    "bg-bgs2 rounded-md p-3 h-full": isConstrainedWidth
  })}
>
  <div class="flex flex-col gap-2">
    {#if !isConstrainedWidth}
      <TaskTitleRow {task} />
    {/if}
    <div class="flex flex-col gap-1">
      {#if isConstrainedWidth}
        <span class="text-b2 text-fgs3">Collections</span>
      {/if}
      <TaskCollectionsRow {task} />
    </div>
  </div>
  <div class="flex flex-col gap-1">
    <span class="text-b2 text-fgs3">Status</span>
    <TaskStatusSwitcher status={$task.status} on:change={handleStatusChange} />
  </div>
  {#if $task.type === TaskType.DEFINITE}
    <TimelineCard {task} />
  {/if}

  {#if $task.description}
    <div>
      <span class="text-b2 text-fgs3">Description</span>
      <Markdown md={$task.description} />
    </div>
  {/if}
</div>
