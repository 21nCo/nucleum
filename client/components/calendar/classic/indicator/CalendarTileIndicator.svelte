<script lang="ts">
  import { Resource } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import type {
    DaySummary,
    ISessionLogThumb,
    ISessionThumb
  } from "$lib/client/products/pointron/logs/log.type";
  import { onMount } from "svelte";
  import type { ICalendarIndicatorData } from "../../calendar.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import YearTileIndicatorDot from "./YearTileIndicatorDot.svelte";
  import MonthTileIndicator from "./MonthTileIndicator.svelte";
  import { isValidArrayWithData } from "$lib/shared/utils/obj.utils";
  import { resolveSessionTimeSplit } from "$lib/client/products/pointron/pointron.utils";
  import { generateSummary } from "$lib/client/products/pointron/focus/session.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  export let date: Date;
  export let data: ICalendarIndicatorData[] = [];
  export let view: "year" | "month" = "year";
  export let isActive: boolean = false;
  let tasks: ITaskThumb[] = [];
  let focusSessions: (ISessionThumb & {
    splits: { focus: number; brek: number };
  })[] = [];
  let summary: DaySummary = { focus: 0, break: 0 };
  $: dayFilter = tzStore.resolveTimePeriodFilterForDay(date);
  onMount(() => {
    resolveData();
  });
  function resolveData() {
    try {
      const tasksData = data.find((x) => x.resource === Resource.task);
      if (tasksData) {
        tasks = tasksData.data.filter(
          (x) =>
            x.dateUnix >= dayFilter.greaterThanOrEqual &&
            x.dateUnix <= dayFilter.lessThanOrEqual
        );
        // console.log({ tasks, ...dayFilter, date });
      }
      const sessionsData = data.find((x) => x.resource === Resource.session);
      if (sessionsData) {
        focusSessions = sessionsData.data.filter(
          (x) =>
            x &&
            x.startUnix >= dayFilter.greaterThanOrEqual &&
            x.startUnix <= dayFilter.lessThanOrEqual
        );

        focusSessions = focusSessions.map((session: ISessionThumb) => ({
          ...session,
          splits: resolveSessionTimeSplit(session)
        }));
        summary = generateSummary(focusSessions);
        // console.log({ focusSessions, summary, ...dayFilter, date, data });
      }
    } catch (e) {
      logger.error({ at: "CalendarTileIndicator.resolveData", date, error: e });
    }
  }

  function getColor(resource: Resource) {
    const resourceData = data.find((x) => x.resource === resource);
    return resourceData?.color ?? "fgs4";
  }
</script>

{#if view === "month"}
  <div
    class={cn("flex flex-col items-start justify-center text-b3", {
      "text-fgs3": !isActive,
      "gap-1": isActive
    })}
  >
    {#if tasks.length > 0}
      <MonthTileIndicator
        text={`${tasks.length} task${tasks.length > 1 ? "s" : ""}`}
        color={getColor(Resource.task)}
        {isActive}
      />
    {/if}
    {#if focusSessions.length > 0}
      <MonthTileIndicator
        text={`F: ${formatSeconds(summary.focus + summary.break)}`}
        color={getColor(Resource.session)}
        {isActive}
      />
    {/if}
  </div>
{:else}
  <div class="flex items-center justify-center gap-0.5">
    {#if tasks.length > 0}
      <YearTileIndicatorDot color={getColor(Resource.task)} {isActive} />
    {/if}
    {#if focusSessions.length > 0}
      <YearTileIndicatorDot color={getColor(Resource.session)} {isActive} />
    {/if}
  </div>
{/if}
