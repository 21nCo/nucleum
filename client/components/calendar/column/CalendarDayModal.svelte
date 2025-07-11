<script lang="ts">
  import CalendarColumn from "./CalendarColumn.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import view from "$lib/client/stores/view.store";
  import { AppSearchParam } from "$lib/client/types/appStore.type";
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
