<script lang="ts">
  import { currentTime } from "@nucleum/shared-state/app-context/app.store";
  import { userPreferences } from "@nucleum/shared-state/preferences/user-preferences.store";
  import { formatTime } from "@21n/shared-utils/datetime/date-formatting";
</script>

<div class="flex flex-col items-center justify-center gap-2 w-full h-full">
  <div class="text-3xl font-semibold 2xl:text-6xl 5xl:text-8xl opacity-30">
    {formatTime($userPreferences, $currentTime)}
  </div>
  <!-- {#if $view.landscapiness > 1.2}
    <div class="flex gap-4 w-full justify-evenly mt-10">
      <TargetGuages size={Size.md} />
    </div>
  {/if} -->
</div>
