<script lang="ts">
  import { userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { isEmptyArray } from "$lib/client/utils/obj.utils";
  import { formatTime } from "$lib/client/utils/time.utils";
  import IntervalBarItem from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBarItem.svelte";

  export let log: any;
  let blocks = log.blocks;
  if (isEmptyArray(log.blocks)) {
    blocks = [{ duration: log.elapsed, type: 1, progress: 1 }];
  }
</script>

<div class="flex items-center gap-4 w-full">
  <div class="text-fgs2 min-w-fit {$view.isPortrait && 'text-b3'}">
    {formatTime($userPreferences, new Date(log.start))}
  </div>
  <div class="flex flex-row items-center gap-3 w-full">
    {#each blocks as bar}
      <div
        style="width: {(log.elapsed
          ? (bar?.duration ?? 0) / log.elapsed
          : 100) * 100}%"
      >
        <IntervalBarItem progress={bar?.progress} type={bar?.type} />
      </div>
    {/each}
  </div>
  <div class="text-fgs2 min-w-fit {$view.isPortrait && 'text-b3'}">
    {formatTime($userPreferences, new Date(log.end))}
  </div>
</div>
