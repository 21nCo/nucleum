<script lang="ts">
  import {
    MetaResource,
    Resource
  } from "@21n/components/flux/resourceStores/resource.enum";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import type {
    DaySummary,
    ISessionThumb
  } from "@21n/products/pointron/logs/log.type";
  import {
    CalendarTileIndicatorDisplayType,
    type ICalendarIndicatorData
  } from "@21n/components/calendar/calendar.type";
  import { cn } from "@21n/utils/ui.utils";
  import YearTileIndicatorDot from "@21n/components/calendar/classic/indicator/YearTileIndicatorDot.svelte";
  import MonthTileIndicator from "@21n/components/calendar/classic/indicator/MonthTileIndicator.svelte";
  import { resolveSessionTimeSplit } from "@21n/products/pointron/pointron.utils";
  import { generateSummary } from "@21n/products/pointron/focus/session.utils";
  import { logger } from "@21n/components/debug/logger.client";
  import { Product } from "@21n/products/product.type";
  import { appStore } from "@21n/stores/app.store";

  let {
    date,
    data = [],
    type = CalendarTileIndicatorDisplayType.DOTS,
    isActive = false,
    indicatorRefreshId = 0,
    resolvedData = undefined
  }: {
    date: Date;
    data?: ICalendarIndicatorData[];
    type?: CalendarTileIndicatorDisplayType;
    isActive?: boolean;
    indicatorRefreshId?: number;
    resolvedData?: {
      tasks: ITaskThumb[];
      focusSessions: (ISessionThumb & {
        splits: { focus: number; brek: number };
      })[];
      nodes: any[];
      calendarNotes: any[];
      summary: DaySummary;
    };
  } = $props();

  let fallbackTasks = $state<ITaskThumb[]>([]);
  let fallbackFocusSessions = $state<
    (ISessionThumb & {
      splits: { focus: number; brek: number };
    })[]
  >([]);
  let fallbackNodes = $state<any[]>([]);
  let fallbackCalendarNotes = $state<any[]>([]);
  let fallbackSummary = $state<DaySummary>({ focus: 0, break: 0 });
  const dayFilter = $derived(tzStore.resolveTimePeriodFilterForDay(date));
  const tasks = $derived(resolvedData?.tasks ?? fallbackTasks);
  const focusSessions = $derived(
    resolvedData?.focusSessions ?? fallbackFocusSessions
  );
  const nodes = $derived(resolvedData?.nodes ?? fallbackNodes);
  const calendarNotes = $derived(
    resolvedData?.calendarNotes ?? fallbackCalendarNotes
  );
  const summary = $derived(resolvedData?.summary ?? fallbackSummary);

  $effect(() => {
    if (!resolvedData && indicatorRefreshId > 0) {
      resolveData();
    }
  });

  function resolveData() {
    const product = $appStore.product;
    if (product === Product.POINTRON) {
      resolvePointronData();
    } else if (product === Product.MEMOTRON) {
      resolveMemotronData();
    } else if (product === Product.NUCLEUM) {
      resolvePointronData();
      resolveMemotronData();
    }
  }

  function resolvePointronData() {
    try {
      const tasksData = data.find((x) => x.resource === Resource.task);
      if (tasksData) {
        fallbackTasks = tasksData.data.filter(
          (x) =>
            x.dateUnix >= dayFilter.greaterThanOrEqual &&
            x.dateUnix <= dayFilter.lessThanOrEqual
        );
      }
      const sessionsData = data.find((x) => x.resource === Resource.session);
      if (sessionsData) {
        fallbackFocusSessions = sessionsData.data.filter(
          (x) =>
            x &&
            x.startUnix >= dayFilter.greaterThanOrEqual &&
            x.startUnix <= dayFilter.lessThanOrEqual
        );

        fallbackFocusSessions = fallbackFocusSessions.map((session: ISessionThumb) => ({
          ...session,
          splits: resolveSessionTimeSplit(session)
        }));
        fallbackSummary = generateSummary(fallbackFocusSessions);
      }
    } catch (e) {
      logger.error({ at: "CalendarTileIndicator.resolveData", date, error: e });
    }
  }

  function resolveMemotronData() {
    try {
      const nodesData = data.find((x) => x.resource === Resource.node);
      if (nodesData) {
        fallbackNodes = nodesData.data.filter(
          (x) =>
            new Date(x.createdAt).getTime() >= dayFilter.greaterThanOrEqual &&
            new Date(x.createdAt).getTime() <= dayFilter.lessThanOrEqual
        );
      }
      const calendarNotesData = data.find(
        (x) => x.resource === MetaResource.calendarNotes
      );
      if (calendarNotesData) {
        fallbackCalendarNotes = calendarNotesData.data.filter(
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
    if (resolvedData) {
      if (resource === Resource.task && tasks.length > 0) return "fgs4";
      if (resource === Resource.session && focusSessions.length > 0) return "aps1";
      if (resource === Resource.node && (nodes.length > 0 || calendarNotes.length > 0)) {
        return "aps1";
      }
    }
    const resourceData = data.find((x) => x.resource === resource);
    return resourceData?.color ?? "fgs4";
  }
</script>

{#if type === CalendarTileIndicatorDisplayType.METRICS}
  <div
    class={cn(
      "flex flex-col items-start justify-center text-b3 w-full h-full number-grid-size",
      {
        "text-fgs3": !isActive,
        "gap-1": isActive
      }
    )}
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
