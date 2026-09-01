<script lang="ts">
  import DayTimelineCore from "./DayTimelineCore.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type {
    CalendarColumnLayout,
    CalendarTimelineEntry
  } from "@21n/components/calendar/calendar.type";
  import type { ISessionThumb } from "@21n/products/pointron/logs/log.type";
  import { resolveSessionTimeSplit } from "@21n/products/pointron/pointron.utils";
  import type { ICalendarEvent } from "@21n/components/events/event.type";
  import { datafn } from "@21n/stores/datafn.store";
  import { time } from "@datafn/client";
  import { toSvelteStore } from "@datafn/svelte";
  import { resolveExpandedSessionItems } from "@21n/products/pointron/logs/session-items.utils";

  let {
    date,
    isExpandable = false,
    layout
  }: {
    date: Date;
    isExpandable?: boolean;
    layout: CalendarColumnLayout;
  } = $props();

  const sessionStore = $derived.by(() =>
    toSvelteStore<ISessionThumb[]>(
      datafn.session.signal({
        select: ["*", "items.*#"],
        temporal: time.day("startUnix", date),
        sort: ["startUnix"]
      }),
      { initialData: [] }
    )
  );
  const eventStore = $derived.by(() =>
    toSvelteStore<ICalendarEvent[]>(
      datafn.event.signal({
        filters: resolveEventOverlapFilters(date),
        sort: ["startUnix"]
      }),
      { initialData: [] }
    )
  );
  const timelineEntries = $derived(
    [
      ...resolveFocusEntries($sessionStore.data),
      ...resolveEventEntries($eventStore.data)
    ].sort((a, b) => a.startUnix - b.startUnix)
  );
  const isLoading = $derived(
    $sessionStore.loading ||
      $sessionStore.refreshing ||
      $eventStore.loading ||
      $eventStore.refreshing
  );

  function resolveEventOverlapFilters(value: Date) {
    const range = datafn.temporal.resolveRangeSync({ scale: "day", at: value });
    return {
      startUnix: { $lte: range.end },
      endUnix: { $gte: range.start }
    };
  }

  function resolveFocusEntries(sessionRecordsInput: ISessionThumb[]) {
    const sessions = sessionRecordsInput.map((session) => ({ ...session }));
    sessions.forEach((session) => {
      session.expandedItems = resolveExpandedSessionItems(session.items);
    });
    if (isValidArrayWithData(sessions)) {
      return sessions.map((session: ISessionThumb) => ({
        startUnix: session.startUnix,
        endUnix: session.endUnix,
        component: "focusTimelineEntry",
        item: {
          ...session,
          splits: resolveSessionTimeSplit(session)
        }
      }));
    }
    return [];
  }

  function resolveEventEntries(events: ICalendarEvent[]) {
    if (isValidArrayWithData(events)) {
      return events.map((event: ICalendarEvent) => ({
        startUnix: event.startUnix ?? date.getTime(),
        endUnix:
          event.endUnix ?? (event.startUnix ?? date.getTime()) + 60 * 60 * 1000,
        item: {
          ...event,
          label: event.label ?? event.event ?? "New event",
          event: event.event ?? event.label ?? "New event"
        }
      }));
    }
    return [];
  }
</script>

<DayTimelineCore
  {date}
  data={timelineEntries}
  {layout}
  isRefreshing={isLoading}
/>
