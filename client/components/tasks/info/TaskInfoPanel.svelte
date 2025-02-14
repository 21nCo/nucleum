<script lang="ts">
  import { type IActiveTaskStore } from "$lib/client/components/tasks/task.store";
  import TaskCollectionsRow from "../TaskCollectionsRow.svelte";
  import { formatDatetime } from "$lib/client/utils/time.utils";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import Markdown from "$lib/client/components/markdown/Markdown.svelte";
  import TaskTitleRow from "./TaskTitleRow.svelte";
  export let task: IActiveTaskStore;
  export let isConstrainedWidth = false;
</script>

{#if !isConstrainedWidth}
  <TaskTitleRow {task} />
{/if}
<div>
  <TaskCollectionsRow {task} />
</div>
{#if $task.startDate || $task.endDate}
  <div class="text-b2 text-fgs3">
    {#if $task.startDate}
      {formatDatetime($userPreferences, $task.startDate)}
    {/if}
    {#if $task.endDate}
      - {formatDatetime($userPreferences, $task.endDate)}
    {/if}
  </div>
{/if}

{#if $task.description}
  <div class="mt-4">
    <span class="text-b2 text-fgs3">Description</span>
    <Markdown md={$task.description} />
  </div>
{/if}
