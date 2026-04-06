<script lang="ts">
  import ComponentBaseLayer from "@21n/layout/layers/ComponentBaseLayer.svelte";
  import DayTimelineCore from "./DayTimelineCore.svelte";
  import { isValidArrayWithData } from "@21n/shared-utils/obj.utils";
  import type {
    CalendarColumnLayout,
    CalendarTimelineEntry
  } from "@21n/components/calendar/calendar.type";
  import { Resource } from "@21n/components/flux/resourceStores/resource.enum";
  import { tzStore } from "@21n/components/settings/timezone/tz.store";
  import { sessionStore } from "@21n/products/pointron/focus/session.store";
  import type { ISessionThumb } from "@21n/products/pointron/logs/log.type";
  import { resolveSessionTimeSplit } from "@21n/products/pointron/pointron.utils";

  let {
    date,
    isExpandable = false,
    layout
  }: {
    date: Date;
    isExpandable?: boolean;
    layout: CalendarColumnLayout;
  } = $props();

  const dateString = $derived(date.toISOString().split("T")[0]);
  let isRefreshing = $state(false);
  let timelineEntries = $state<CalendarTimelineEntry[]>([]);

  $effect(() => {
    if (dateString) {
      refreshTimelineEntries();
    }
  });

  async function refreshFocusEntries() {
    const dayFilter = tzStore.resolveTimePeriodFilterForDay(date);
    const result = await sessionStore.selectManyWithItemsExpansion(
      {
        filters: {
          startUnix: dayFilter
        },
        orderBy: {
          startUnix: "asc"
        }
      },
      {
        isExpand: true
      }
    );
    if (isValidArrayWithData(result)) {
      return result.map((session: ISessionThumb) => ({
        startUnix: session.startUnix,
        endUnix: session.endUnix,
        component: "focusTimelineEntry",
        item: {
          ...session,
          splits: resolveSessionTimeSplit(session)
        }
      }));
    }
  }

  async function refreshTimelineEntries() {
    isRefreshing = true;
    const focusEntries = await refreshFocusEntries();
    if (isValidArrayWithData(focusEntries)) {
      timelineEntries = [...focusEntries];
    }
    isRefreshing = false;
  }
</script>

<DayTimelineCore {date} data={timelineEntries} {layout} {isRefreshing} />
<ComponentBaseLayer
  subscribeToResource={new Set([Resource.session])}
  onChange={refreshTimelineEntries}
/>
