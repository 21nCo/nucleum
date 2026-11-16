<script lang="ts">
  import { requireRecordRenderer } from "@nucleum/shared-state/resources/record-renderer";
  const Records = requireRecordRenderer();
  import EmptyStatusView from "@21n/ui/elements/feedback/EmptyStatusView.svelte";
  import type { ICalendarEvent } from "@nucleum/features/calendar/events/event.type";
  import { Resource } from "@nucleum/datafn/resource.enum";
  import { ResourceAccessPoint } from "@nucleum/datafn/resource.type";
  import { Arrangement } from "@21n/ui/elements/direction.enum";
  import { datafn } from "@nucleum/datafn/datafn.store";
  import { createCalendarEventsStore } from "@nucleum/features/calendar/calendar-events.store";

  let {
    date,
    accessPoint = ResourceAccessPoint.CALENDAR
  }: {
    date: Date;
    accessPoint?: ResourceAccessPoint;
  } = $props();

  const eventStore = $derived(
    createCalendarEventsStore<Partial<ICalendarEvent>>(
      datafn.temporal.resolveRangeSync({ scale: "day", at: date })
    )
  );
  const events = $derived($eventStore.data.map(normalizeEventRecord));
  const isRefreshing = $derived($eventStore.loading || $eventStore.refreshing);

  function normalizeEventRecord(
    record: Partial<ICalendarEvent>
  ): ICalendarEvent {
    const label = record.label ?? record.event ?? "New event";
    return {
      ...record,
      label,
      event: record.event ?? label,
      startUnix: record.startUnix ?? record.value?.startUnix,
      endUnix: record.endUnix ?? record.value?.endUnix
    } as ICalendarEvent;
  }
</script>

<div class="flex py-3 w-full flex-grow styledscroll">
  {#if isRefreshing || events.length === 0}
    <EmptyStatusView
      isLoadingState={isRefreshing}
      mainText="No events found."
      isSearchContext={true}
    />
  {:else}
    <Records
      data={events}
      resource={Resource.event}
      {accessPoint}
      arrangement={Arrangement.LIST}
    />
  {/if}
</div>
