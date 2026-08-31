<script lang="ts">
  import ResourceThumbnailBase from "@21n/components/record/thumbnail/ResourceThumbnailBase.svelte";
  import type { ICalendarEvent } from "@21n/components/events/event.type";
  import { ResourceAccessPoint } from "@21n/data/datafn/resource.type";
  import { Arrangement } from "@21n/types/direction.enum";
  import { formatTime, parseAndFormatDate } from "@21n/utils/time.utils";
  import { userPreferences } from "@21n/components/settings/userPreferences.store";

  let {
    item,
    accessPoint = ResourceAccessPoint.LIBRARY,
    arrangement = Arrangement.LIST,
    onClick = undefined
  }: {
    item: ICalendarEvent;
    accessPoint?: ResourceAccessPoint;
    arrangement?: Arrangement;
    onClick?: ((event: MouseEvent) => void) | undefined;
  } = $props();

  const startDate = $derived(
    item.startUnix ? new Date(item.startUnix) : undefined
  );
  const endDate = $derived(item.endUnix ? new Date(item.endUnix) : undefined);
  const timeLabel = $derived(
    startDate
      ? `${parseAndFormatDate(startDate)} ${formatTime($userPreferences, startDate)}${
          endDate ? " - " + formatTime($userPreferences, endDate) : ""
        }`
      : undefined
  );
</script>

<ResourceThumbnailBase {item} {accessPoint} {arrangement} {onClick}>
  <div class="flex flex-col gap-1 min-w-0 w-full">
    <div class="text-b2 text-fgs1 truncate">
      {item.label ?? item.event ?? "Untitled event"}
    </div>
    {#if timeLabel}
      <div class="text-b3 text-fgs3 truncate">{timeLabel}</div>
    {/if}
  </div>
</ResourceThumbnailBase>
