<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import IntervalBarItem from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBarItem.svelte";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import {
    IntervalBarContext,
    type IntervalBlock
  } from "$lib/client/types/pointron/session.type";
  import TimeLabel from "./TimeLabel.svelte";
  export let context: IntervalBarContext = IntervalBarContext.DEFAULT;

  function resolveCountupBarDuration(bar: IntervalBlock) {
    if ($sessionStore.blocks.length == 1 && bar.start) {
      return (Date.now() - bar.start) / 1000;
    } else if (bar.start && bar.end && bar.end > bar.start) {
      return (bar.end - bar.start) / 1000;
    } else if (bar.start) {
      return (Date.now() - bar.start) / 1000;
    } else {
      return bar.duration;
    }
  }
</script>

<div class="flex w-full gap-4 pt-4 items-center h-12 min-h-[3rem]">
  <TimeLabel label="start" {context} />
  <div class="flex flex-row items-center gap-3 w-full">
    {#each $sessionStore.blocks as bar}
      <div
        style="width: {($sessionStore.type != SessionType.COUNTUP
          ? (bar?.duration ?? 0) / $sessionStore.plannedDuration
          : $sessionStore.totalElapsed
            ? (resolveCountupBarDuration(bar) ?? 0) / $sessionStore.totalElapsed
            : 100) * 100}%"
      >
        <IntervalBarItem progress={bar?.progress} type={bar?.type} {context} />
      </div>
    {/each}
  </div>
  <TimeLabel label="end" {context} />
</div>
