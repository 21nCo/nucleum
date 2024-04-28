<script>
  import MicroIndicatorTile from "./MicroIndicatorTile.svelte";
  import { CalendarHeatMapstoreColors } from "./calendarHeatmap.store";

  let colors = $CalendarHeatMapstoreColors;
</script>

<div class="flex gap-2 justify-end mr-5 text-sm">
  {"Less"}
  {#each colors as color}
    <MicroIndicatorTile data={{}} --tileBgColor={color} />
    <!-- stop propogation for emiited event from MicroIndicatorTile only for footer -->
  {/each}
  {"More"}
</div>
