<script lang="ts">
  import CalendarColumn from "@nucleum/features/calendar/column/CalendarColumn.svelte";
  import { TimeScaleUnit } from "@21n/shared-utils/datetime/period.type";
  import view from "@21n/ui/environment/view.store";
  import { AppSearchParam } from "@nucleum/shared-state/app-context/app-store.type";
  import { page } from "$app/stores";

  let {
    date = new Date(
      $page.url?.searchParams?.get(AppSearchParam.DATE) ??
        new Date().toISOString()
    ),
    scale = TimeScaleUnit.DAY
  }: {
    date?: Date;
    scale?: TimeScaleUnit;
  } = $props();
</script>

<CalendarColumn
  {date}
  {scale}
  isRewind={true}
  isCwContext={$view.isConstrainedWidth}
/>
