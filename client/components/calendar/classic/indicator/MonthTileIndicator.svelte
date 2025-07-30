<script lang="ts">
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import type { DaySummary } from "$lib/client/products/pointron/logs/log.type";
  import { Size } from "$lib/client/types/size.enum";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { cn } from "$lib/client/utils/ui.utils";
  export let data: {
    tasks: ITaskThumb[];
    focusSummary: DaySummary;
    nodes: any;
    calendarNotes: any;
  };
  export let isActive: boolean = false;
  const isMemoryAvailable =
    data.nodes.length > 0 || data.calendarNotes.length > 0;
</script>

<div
  class={cn(
    "grid grid-rows-[auto_1fr] text-b4 2k:text-b3 gap-1 w-full h-full",
    {
      "text-aps1": isActive,
      "text-fgs3 group-hover:text-fgs2": !isActive
    }
  )}
>
  {#if data.tasks.length > 0 || data.focusSummary.focus > 0}
    <div
      class={cn("flex items-start justify-between gap-2", {
        "border-b pb-1": isMemoryAvailable,
        "border-brs1": isMemoryAvailable && !isActive,
        "border-aps2": isMemoryAvailable && isActive
      })}
    >
      <div class="flex py-1">
        <Icon
          icon="circle"
          class={cn({
            "text-aps1": isActive,
            "text-fgs3 group-hover:text-fgs1": !isActive
          })}
          size={Size.xxs}
        />
      </div>
      <div class="flex flex-col items-end">
        {#if data.tasks.length > 0}
          {@const completedCount = data.tasks.filter(
            (task) => task.isChecked
          ).length}
          <div class="flex items-center gap-0.5">
            <span>{completedCount}</span>/
            <span>{data.tasks.length}</span>
            &nbsp;task{data.tasks.length > 1 ? "s" : ""}
          </div>
        {/if}
        {#if data.focusSummary.focus > 0}
          <div class="flex items-center gap-0.5">
            F:
            <span
              >{formatSeconds(
                data.focusSummary.focus + data.focusSummary.break
              )}</span
            >
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if isMemoryAvailable}
    <div class="flex items-start justify-between gap-2">
      <div class="flex py-1">
        <Icon
          icon="hexagon"
          class={cn({
            "text-aps1": isActive,
            "text-fgs3 group-hover:text-fgs1": !isActive
          })}
          size={Size.xxs}
        />
      </div>
      <div class="flex flex-col items-end">
        {#if data.nodes.length > 0}
          <div class="flex items-center gap-0.5">
            <span>{data.nodes.length}</span>
            &nbsp;node{data.nodes.length > 1 ? "s" : ""}
          </div>
        {/if}
        {#if data.calendarNotes.length > 0}
          <div class="flex items-center gap-0.5">Day notes</div>
        {/if}
      </div>
    </div>
  {/if}
</div>
