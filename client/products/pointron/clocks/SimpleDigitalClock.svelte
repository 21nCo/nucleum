<script lang="ts">
  import { AnalyticsPersistence } from "$lib/client/products/pointron/analytics/analytics.persistence";
  import { currentTime, userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { TimeScale } from "$lib/client/types/time.type";
  import { onMount } from "svelte";
  import TargetGuages from "../analytics/targets/TargetGuages.svelte";
  import { Size } from "$lib/client/types/size.enum";
  import { formatTime } from "$lib/client/utils/time.utils";
  let focusToday: number;
  let aggPersistance = new AnalyticsPersistence();
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
    <div class="flex gap-4 w-full justify-evenly mt-10">
      <TargetGuages size={Size.md} />
    </div>
  {/if}
</div>
