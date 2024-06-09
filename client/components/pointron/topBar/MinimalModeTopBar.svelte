<script lang="ts">
  import { todayFocusStore } from "$lib/client/components/pointron/focus/session.store";
  import DatePart from "./DatePart.svelte";
  import DayFocusTimer from "./DayFocusTimer.svelte";
  import ProgressBar from "$lib/client/elements/ProgressBar.svelte";
  import { userLocalPreferences } from "../../stores/local.store";
  $: todayProgress = $userLocalPreferences.dailyFocusTarget
    ? $todayFocusStore.focus /
      (60 * 60) /
      $userLocalPreferences.dailyFocusTarget
    : 0;
</script>

<div class="flex flex-row w-full h-full gap-3 items-center">
  <div class="flex flex-row gap-3 items-center flex-wrap flex-grow h-full">
    <div class="text-h2"><DatePart /></div>
    <div class="flex-grow" />

    <div class="flex flex-col gap-1 justify-center">
      <div class="flex flex-row md:justify-end text-xs pr-2">
        Today's focus: <DayFocusTimer />
      </div>
      {#if $userLocalPreferences.isEnableDailyTarget}
        <div><ProgressBar progress={todayProgress} /></div>
      {/if}
    </div>
  </div>
</div>
