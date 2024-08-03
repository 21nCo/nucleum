<script lang="ts">
  import { currentTime, userPreferences } from "$lib/client/stores/app.store";

  import { formatTime } from "$lib/client/utils/time.utils";
</script>

<div class="flex flex-col items-center gap-2">
  <div class="text-3xl font-semibold 2xl:text-6xl 5xl:text-8xl opacity-30">
    {formatTime($userPreferences, $currentTime)}
  </div>
  <!-- {#if $view.landscapiness > 1.2}
    <div class="flex gap-4 w-full justify-evenly mt-10">
      <TargetGuages size={Size.md} />
    </div>
  {/if} -->
</div>
