<script lang="ts">
  import { AnalyticsPersistance } from "$lib/client/components/pointron/analytics/analytics.persistance";
  import { currentTime, userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { TimeScale } from "$lib/client/types/time.type";
  import { formatSeconds, formatTime } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import TargetGuages from "../analytics/targets/TargetGuages.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import BackgroundElement from "$lib/client/elements/style/BackgroundElement.svelte";
  let dateString = $currentTime.toLocaleString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  let focusToday: number;
  let aggPersistance = new AnalyticsPersistance();
  onMount(async () => {
    await refresh();
  });
  async function refresh() {
    focusToday = await aggPersistance.fetchAggFocusByCurrentTimeHorizon(
      TimeScale.DAYS
    );
  }
</script>

<div class="flex flex-col items-center gap-2">
  <div class="text-3xl font-semibold 2xl:text-6xl 5xl:text-8xl opacity-30">
    {formatTime($userPreferences, $currentTime)}
  </div>
  {#if $view.landscapiness > 1.2}
    <!-- <BackgroundElement
      class="text-fgs2 px-4 py-3 rounded-sm font-medium flex justify-between"
    >
      {dateString}
      <div>
        {focusToday
          ? `Today's focus: ` + formatSeconds(focusToday)
          : "Not focused today"}
      </div>
    </BackgroundElement> -->
    <div class="flex gap-4 w-full justify-evenly mt-10">
      <TargetGuages size={Size.md} />
    </div>
  {/if}
</div>
