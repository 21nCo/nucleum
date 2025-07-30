<script lang="ts">
  import {
    MetaResource,
    Resource
  } from "$lib/client/components/flux/resourceStores/resource.enum";
  import type { ITaskThumb } from "$lib/client/components/tasks/task.type";
  import { tzStore } from "$lib/client/components/settings/timezone/tz.store";
  import type {
    DaySummary,
    ISessionThumb
  } from "$lib/client/products/pointron/logs/log.type";
  import {
    CalendarTileIndicatorDisplayType,
    type ICalendarIndicatorData
  } from "../../calendar.type";
  import { cn } from "$lib/client/utils/ui.utils";
  import YearTileIndicatorDot from "./YearTileIndicatorDot.svelte";
  import MonthTileIndicator from "./MonthTileIndicator.svelte";
  import { resolveSessionTimeSplit } from "$lib/client/products/pointron/pointron.utils";
  import { generateSummary } from "$lib/client/products/pointron/focus/session.utils";
  import { formatSeconds } from "$lib/client/utils/time.utils";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { Product } from "$lib/client/types/product.type";
  import { appStore } from "$lib/client/stores/app.store";

  export let date: Date;
  export let data: ICalendarIndicatorData[] = [];
  export let type: CalendarTileIndicatorDisplayType =
    CalendarTileIndicatorDisplayType.DOTS;
  export let isActive: boolean = false;
  export let indicatorRefreshId: number = 0;

  let tasks: ITaskThumb[] = [];
  let focusSessions: (ISessionThumb & {
    splits: { focus: number; brek: number };
  })[] = [];
  let nodes: any[] = [];
  let calendarNotes: any[] = [];
  let summary: DaySummary = { focus: 0, break: 0 };
  $: dayFilter = tzStore.resolveTimePeriodFilterForDay(date);
  $: if (indicatorRefreshId > 0) {
    resolveData();
  }

  function resolveData() {
    const product = $appStore.product;
    if (product === Product.POINTRON) {
      resolvePointronData();
    } else if (product === Product.MEMOTRON) {
      resolveMemotronData();
    } else if (product === Product.NUCLEUS) {
      resolvePointronData();
      resolveMemotronData();
    }
  }

  function resolvePointronData() {
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

  function resolveMemotronData() {
    try {
      const nodesData = data.find((x) => x.resource === Resource.node);
      if (nodesData) {
        nodes = nodesData.data.filter(
          (x) =>
            new Date(x.createdAt).getTime() >= dayFilter.greaterThanOrEqual &&
            new Date(x.createdAt).getTime() <= dayFilter.lessThanOrEqual
        );
      }
      const calendarNotesData = data.find(
        (x) => x.resource === MetaResource.calendarNotes
      );
      if (calendarNotesData) {
        calendarNotes = calendarNotesData.data.filter(
          (x) =>
            new Date(x.date).getTime() >= dayFilter.greaterThanOrEqual &&
            new Date(x.date).getTime() <= dayFilter.lessThanOrEqual &&
            x.text
        );
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

{#if type === CalendarTileIndicatorDisplayType.METRICS}
  <div
    class={cn("flex flex-col items-start justify-center text-b3 w-full", {
      "text-fgs3": !isActive,
      "gap-1": isActive
    })}
  >
    <MonthTileIndicator
      data={{
        tasks,
        focusSummary: summary,
        nodes,
        calendarNotes
      }}
      {isActive}
    />
  </div>
{:else if type === CalendarTileIndicatorDisplayType.DOTS}
  <div class="flex items-center justify-center gap-0.5">
    {#if tasks.length > 0}
      <YearTileIndicatorDot color={getColor(Resource.task)} {isActive} />
    {/if}
    {#if focusSessions.length > 0}
      <YearTileIndicatorDot color={getColor(Resource.session)} {isActive} />
    {/if}
    {#if nodes.length > 0 || calendarNotes.length > 0}
      <YearTileIndicatorDot
        color={getColor(Resource.node)}
        {isActive}
        isMemory={true}
      />
    {/if}
  </div>
{/if}
