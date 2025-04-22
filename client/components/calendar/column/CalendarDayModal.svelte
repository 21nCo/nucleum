<script lang="ts">
  import CalendarColumn from "./CalendarColumn.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";

  export let date: Date;
  export let scale: TimeScaleUnit = TimeScaleUnit.DAY;
</script>

<CalendarColumn {date} {scale} isShowTitleBar={true} isRewind={true} />
