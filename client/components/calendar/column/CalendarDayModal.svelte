<script lang="ts">
  import CalendarColumn from "@21n/components/calendar/column/CalendarColumn.svelte";
  import { TimeScaleUnit } from "@21n/types/time.type";
  import view from "@21n/stores/view.store";
  import { AppSearchParam } from "@21n/types/appStore.type";
  import { page } from "$app/stores";
  export let date: Date = new Date(
    $page.url.searchParams.get(AppSearchParam.DATE) ?? new Date().toISOString()
  );
  export let scale: TimeScaleUnit = TimeScaleUnit.DAY;
</script>

<CalendarColumn
  {date}
  {scale}
  isRewind={true}
  isCwContext={$view.isConstrainedWidth}
/>
