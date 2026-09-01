<script lang="ts">
  import Records from "@21n/components/record/Records.svelte";
  import EmptyStatusView from "@21n/elements/feedback/EmptyStatusView.svelte";
  import type { ICalendarEvent } from "@21n/components/events/event.type";
  import { Resource } from "@21n/data/datafn/resource.enum";
  import { ResourceAccessPoint } from "@21n/data/datafn/resource.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { datafn } from "@21n/stores/datafn.store";
  import { toSvelteStore } from "@datafn/svelte";

  let {
    date,
    accessPoint = ResourceAccessPoint.CALENDAR
  }: {
    date: Date;
    accessPoint?: ResourceAccessPoint;
  } = $props();

  const eventStore = $derived.by(() =>
    toSvelteStore<Partial<ICalendarEvent>[]>(
      datafn.event.signal({
        filters: resolveEventOverlapFilters(date),
        sort: ["startUnix"]
      }),
      { initialData: [] }
    )
  );
  const events = $derived($eventStore.data.map(normalizeEventRecord));
  const isRefreshing = $derived($eventStore.loading || $eventStore.refreshing);

  function resolveEventOverlapFilters(value: Date) {
    const range = datafn.temporal.resolveRangeSync({ scale: "day", at: value });
    return {
      $or: [
        {
          startUnix: { $lte: range.end },
          endUnix: { $gte: range.start }
        },
        {
          "value.startUnix": { $lte: range.end },
          "value.endUnix": { $gte: range.start }
        }
      ]
    };
  }

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
