<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import IntervalBarItem from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBarItem.svelte";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import {
    IntervalBarContext,
    type IntervalBlock
  } from "$lib/client/types/pointron/session.type";
  import TimeLabel from "./TimeLabel.svelte";
  import view from "$lib/client/stores/view.store";
  import MoreBarsInfo from "./MoreBarsInfo.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  export let context: IntervalBarContext = IntervalBarContext.DEFAULT;
  let preceedingHiddenBars: IntervalBlock[] = [];
  let succeedingHiddenBars: IntervalBlock[] = [];
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
  $: visibleLimit =
    $view.isPortrait || context === IntervalBarContext.THIN_ON_DESKTOP ? 4 : 10;
  $: isHideSomeBars = $sessionStore.blocks.length > visibleLimit;
  $: visibleBars = resolveVisibleBars($sessionStore.blocks);
  function resolveVisibleBars(blocks: IntervalBlock[]) {
    // console.log({
    //   context,
    //   visibleLimit,
    //   isHideSomeBars,
    //   type: $sessionStore.type
    // });
    if (!isHideSomeBars || $sessionStore.type === SessionType.COUNTUP) {
      preceedingHiddenBars = [];
      succeedingHiddenBars = [];
      return blocks;
    }
    let barInProgressIndex = blocks.findIndex(
      (x) => x.progress != 1 && x.progress != 0
    );
    if (
      barInProgressIndex === -1 &&
      $sessionStore.state === SessionState.NOT_STARTED
    ) {
      barInProgressIndex = Math.floor(blocks.length / 2);
    }

    const halfVisible = Math.floor(visibleLimit / 2);
    let startIndex = Math.max(0, barInProgressIndex - halfVisible);
    let endIndex = Math.min(blocks.length, startIndex + visibleLimit);

    if (endIndex === blocks.length) {
      startIndex = Math.max(0, endIndex - visibleLimit);
    }
    if (startIndex === 0) {
      endIndex = Math.min(blocks.length, visibleLimit);
    }

    preceedingHiddenBars = blocks.slice(0, startIndex);
    succeedingHiddenBars = blocks.slice(endIndex);
    return blocks.slice(startIndex, endIndex);

    // const startIndex = Math.max(
    //   0,
    //   Math.min(barInProgressIndex, blocks.length - visibleLimit)
    // );
    // const endIndex = Math.min(startIndex + visibleLimit, blocks.length);

    // preceedingHiddenBars = blocks.slice(0, startIndex);
    // succeedingHiddenBars = blocks.slice(endIndex);
    // return blocks.slice(startIndex, endIndex);

    if (barInProgressIndex <= visibleLimit / 2) {
      preceedingHiddenBars = [];
      succeedingHiddenBars = blocks.slice(visibleLimit);
      return blocks.slice(0, visibleLimit);
    } else if (
      barInProgressIndex >
      $sessionStore.blocks.length - visibleLimit
    ) {
      preceedingHiddenBars = blocks.slice(0, barInProgressIndex - visibleLimit);
      succeedingHiddenBars = [];
      return blocks.slice(-visibleLimit);
    } else {
    }
  }
  function resolveWidth(bar: IntervalBlock) {
    if ($sessionStore.type === SessionType.COUNTUP) {
      return (
        ($sessionStore.totalElapsed
          ? (resolveCountupBarDuration(bar) ?? 0) / $sessionStore.totalElapsed
          : 100) * 100
      );
    } else if (!isHideSomeBars)
      return ((bar?.duration ?? 0) / $sessionStore.plannedDuration) * 100;
    return (
      ((bar.duration ?? 0) /
        visibleBars.reduce((acc, cur) => acc + cur.duration, 0)) *
      80
    );
  }
</script>

<div class="flex w-full gap-4 pt-4 items-center h-12 min-h-[3rem]">
  <TimeLabel label="start" {context} />
  <div class="flex flex-row items-center gap-3 mo:gap-1 w-full">
    {#if preceedingHiddenBars.length > 0}
      <MoreBarsInfo length={preceedingHiddenBars.length} />
    {/if}
    {#each visibleBars as bar}
      <div style="width: {resolveWidth(bar)}%">
        <IntervalBarItem progress={bar?.progress} type={bar?.type} {context} />
      </div>
    {/each}
    {#if succeedingHiddenBars.length > 0}
      <MoreBarsInfo length={succeedingHiddenBars.length} />
    {/if}
  </div>
  <TimeLabel label="end" {context} />
</div>
