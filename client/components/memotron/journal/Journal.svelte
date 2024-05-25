<script lang="ts">
  import CalendarHeatMap from "$lib/client/components/calendarHeatmap/CalendarHeatMap.svelte";
  import { CalendarHmVariant } from "$lib/client/components/calendarHeatmap/calendarHeatmap.types";
  import view from "$lib/client/stores/view.store";
  import { Orientation } from "$lib/client/types/direction.enum";
  import Timeline from "./timeline/Timeline.svelte";
</script>

{#if $view.isPortrait}
  <Timeline parentBgIndex={1} />
{:else}
  <div class="w-full h-full flex gap-8">
    <div
      class="flex flex-col justify-center h-full w-[25rem] overflow-auto px-8"
    >
      <div class="h-[45rem] w-full">
        <!-- TODO - provider -->
        <!-- <CalendarHeatMap
          touchDevice={false}
          orientation={Orientation.Vertical}
          variant={CalendarHmVariant.PLAIN}
        /> -->
      </div>
    </div>
    <div class="flex gap-8 h-full py-8 pr-8 grow">
      <div class="w-[30rem] h-full">
        <Timeline parentBgIndex={1} />
      </div>
      <!-- <div
        class="flex flex-col items-start gap-4 justify-start h-full flex-grow bg-bgs2 rounded-md"
      >
        <ComingSoonView
          size={Size.sm}
          mainText="Rewind"
          subText="Rewind will be available soon..."
        />
      </div> -->
    </div>
  </div>
{/if}
