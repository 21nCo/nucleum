<script lang="ts">
  import { page } from "$app/stores";
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  import type { ITaskThumb } from "./task.type";
  import TaskThumbnail from "./TaskThumbnail.svelte";
  import { formatDate } from "$lib/client/utils/time.utils";
  export let data: ITaskThumb[];
  export let arrangement: Arrangement = Arrangement.LIST;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.LIBRARY;
  export let accessPointId: string;
  export let parentBgIndex = 1;
  $: typeParam = $page.url.searchParams.get("type");

  $: tasksByDate = typeParam === "bydate" ? groupTasksByDate(data) : null;

  function groupTasksByDate(tasks: ITaskThumb[]) {
    const groups = new Map<string, ITaskThumb[]>();

    // Group tasks by date
    tasks.forEach((task) => {
      const dateKey = task.date ? formatDate(task.date) : "No Date";
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)?.push(task);
    });

    // Convert to array and sort by date descending
    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "No Date") return 1;
      if (b[0] === "No Date") return -1;
      return new Date(b[0]).getTime() - new Date(a[0]).getTime();
    });
  }
</script>

{#if typeParam === "bydate" && tasksByDate}
  <div class="flex flex-col gap-4">
    {#each tasksByDate as [date, tasks]}
      <div class="flex flex-col gap-2">
        <h3 class="text-fgs3 text-b2 font-medium">{date}</h3>
        <div class="flex flex-col gap-2">
          {#each tasks as item}
            <TaskThumbnail
              {item}
              {accessPoint}
              {parentBgIndex}
              {arrangement}
              on:click
            />
          {/each}
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="flex flex-col gap-2">
    {#each data as item}
      <TaskThumbnail
        {item}
        {accessPoint}
        {parentBgIndex}
        {arrangement}
        on:click
      />
    {/each}
  </div>
{/if}
