<script lang="ts">
  import HorizontalHmv1 from "$lib/tidy/components/calendarHeatmap/HorizontalHMV1.svelte";
  import HorizontalHmv2 from "$lib/tidy/components/calendarHeatmap/HorizontalHMV2.svelte";
  import VerticalHmv1 from "$lib/tidy/components/calendarHeatmap/VerticalHMV1.svelte";
  import VerticalHmv2 from "$lib/tidy/components/calendarHeatmap/VerticalHMV2.svelte";
  import {
    CalendarHeatMapLayout,
    isTouchDevice
  } from "$lib/tidy/stores/app.store";
  import { CalendarLayout } from "$lib/tidy/types/CalendarHeatMap.enum";
  export let view: "V1" | "V2";
  export let variant: CalendarLayout;
  export let touchDevice: boolean;
  $: {
    $CalendarHeatMapLayout = variant;
  }
  $: $isTouchDevice = touchDevice;
</script>

{#if $CalendarHeatMapLayout === CalendarLayout.HORIZONTAL && view === "V1"}
  <HorizontalHmv1 />
{:else if $CalendarHeatMapLayout === CalendarLayout.HORIZONTAL && view === "V2"}
  <HorizontalHmv2 />
{:else if $CalendarHeatMapLayout === CalendarLayout.VERTICAL && view === "V1"}
  <VerticalHmv1 />
{:else if $CalendarHeatMapLayout === CalendarLayout.VERTICAL && view === "V2"}
  <VerticalHmv2 />
{/if}
