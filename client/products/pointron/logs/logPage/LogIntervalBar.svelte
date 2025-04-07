<script lang="ts">
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import view from "$lib/client/stores/view.store";
  import { isEmptyArray } from "$lib/shared/utils/obj.utils";
  import { formatTime } from "$lib/client/utils/time.utils";
  import IntervalBarItem from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBarItem.svelte";
  import type { ISessionInterval } from "$lib/client/types/pointron/session.type";
  import MoreBarsInfo from "../../focus/elements/intervalbar/MoreBarsInfo.svelte";
  export let log: any;
  let blocks = log.blocks;
  $: visibleLimit = $view.isPortrait ? 6 : 12;
  let overFlowBlocks: ISessionInterval[] = [];
  if (isEmptyArray(log.blocks)) {
    blocks = [{ duration: log.elapsed, type: 1, progress: 1 }];
  }
  if (blocks.length > visibleLimit) {
    blocks = blocks.slice(0, visibleLimit);
    overFlowBlocks = log.blocks.slice(visibleLimit);
  }
</script>

<div class="flex items-center gap-4 w-full">
  <div class="text-fgs2 min-w-fit {$view.isPortrait && 'text-b3'}">
    {formatTime($userPreferences, new Date(log.startUnix))}
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
    {#if overFlowBlocks.length > 0}
      <MoreBarsInfo length={overFlowBlocks.length} />
    {/if}
  </div>
  <div class="text-fgs2 min-w-fit {$view.isPortrait && 'text-b3'}">
    {formatTime($userPreferences, new Date(log.plannedEndUnix ?? log.endUnix))}
  </div>
</div>
