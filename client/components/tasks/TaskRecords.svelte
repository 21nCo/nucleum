<script lang="ts">
  import { Arrangement } from "$lib/client/types/direction.enum";
  import { ResourceAccessPoint } from "../flux/resourceStores/resource.type";
  import { TaskSubTypeForSwitcher, type ITaskThumb } from "./task.type";
  import TaskThumbnail from "./TaskThumbnail.svelte";
  import { parseAndFormatDate } from "$lib/client/utils/time.utils";
  import { Size } from "$lib/client/types/size.enum";
  import type { IRecordId } from "$lib/client/types/data.type";
  import Button from "$lib/client/elements/button/Button.svelte";
  import type { SubType } from "../library/library.type";
  export let data: ITaskThumb[];
  export let arrangement: Arrangement = Arrangement.LIST;
  export let accessPoint: ResourceAccessPoint = ResourceAccessPoint.LIBRARY;
  export let accessPointId: IRecordId | undefined = undefined;
  export let parentBgIndex = 1;
  export let subType: SubType | undefined = undefined;

  $: tasksByDate =
    subType === TaskSubTypeForSwitcher.BY_MONTH ? groupTasksByDate(data) : null;

  export function scrollToDate(date: Date) {
    const dateKey = parseAndFormatDate(date);
    let dateElement = document.querySelector(
      `[data-date="${dateKey}"]`
    ) as HTMLDivElement;

    if (!dateElement && tasksByDate && tasksByDate.length > 0) {
      const targetTime = date.getTime();
      let closestDate: string | null = null;
      let minDiff = Infinity;

      tasksByDate.forEach(([dateStr]) => {
        if (dateStr === "No Date") return;

        const currentDate = new Date(dateStr);
        const diff = Math.abs(currentDate.getTime() - targetTime);

        if (diff < minDiff) {
          minDiff = diff;
          closestDate = dateStr;
        }
      });

      if (closestDate) {
        dateElement = document.querySelector(
          `[data-date="${parseAndFormatDate(new Date(closestDate))}"]`
        ) as HTMLDivElement;
      }
    }

    dateElement?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function groupTasksByDate(tasks: ITaskThumb[]) {
    const groups = new Map<string, ITaskThumb[]>();

    tasks.forEach((task) => {
      const dateKey = task.dateUnix
        ? parseAndFormatDate(new Date(task.dateUnix))!
        : "No Date";
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(task);
    });

    return Array.from(groups.entries()).sort((a, b) => {
      if (a[0] === "No Date") return 1;
      if (b[0] === "No Date") return -1;
      return new Date(a[0]).getTime() - new Date(b[0]).getTime();
    });
  }

  function resolveSize(accessPoint: ResourceAccessPoint) {
    if (
      accessPoint === ResourceAccessPoint.LIBRARY ||
      accessPoint === ResourceAccessPoint.GOAL
    ) {
      return Size.lg;
    }
    return Size.md;
  }
</script>

{#if subType === TaskSubTypeForSwitcher.BY_MONTH && tasksByDate}
  <div class="flex flex-col gap-12">
    {#each tasksByDate as [date, tasks]}
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <h3
            class="text-fgs3 text-h5"
            data-date={parseAndFormatDate(new Date(date))}
          >
            {date}
          </h3>
          <!-- <Button icon="ph:plus" size={Size.sm} tooltip="Add task" /> -->
        </div>
        <div class="flex flex-col gap-2">
          {#each tasks as item}
            <TaskThumbnail
              {item}
              {accessPoint}
              {accessPointId}
              {parentBgIndex}
              {arrangement}
              size={resolveSize(accessPoint)}
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
        {accessPointId}
        {parentBgIndex}
        {arrangement}
        size={resolveSize(accessPoint)}
        on:click
      />
    {/each}
  </div>
{/if}
