<script lang="ts">
  import CalendarColumn from "./CalendarColumn.svelte";
  import { TimeScaleUnit } from "$lib/client/types/time.type";
  import view from "$lib/client/stores/view.store";
  export let date: Date;
  export let scale: TimeScaleUnit = TimeScaleUnit.DAY;
</script>

<CalendarColumn
  {date}
  {scale}
  isShowTitleBar={true}
  isRewind={true}
  isCwContext={$view.isConstrainedWidth}
/>
