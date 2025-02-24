<script lang="ts">
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import IntervalBarItem from "$lib/client/products/pointron/focus/elements/intervalbar/IntervalBarItem.svelte";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import {
    SessionUIContext,
    type ISessionInterval
  } from "$lib/client/types/pointron/session.type";
  import TimeLabel from "./TimeLabel.svelte";
  import view from "$lib/client/stores/view.store";
  import MoreBarsInfo from "./MoreBarsInfo.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { deepCopy } from "$lib/shared/utils/obj.utils";
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  let preceedingHiddenBars: ISessionInterval[] = [];
  let succeedingHiddenBars: ISessionInterval[] = [];
  function resolveCountupBarDuration(bar: ISessionInterval) {
    const barIndex = $activeSession.intervals.findIndex((x) => x.id == bar.id);
    const endTime = $activeSession.intervals[barIndex + 1]?.start;
    if (bar.start && barIndex > -1 && endTime) {
      return (endTime - bar.start) / 1000;
    } else if (bar.start) {
      return (Date.now() - bar.start) / 1000;
    } else {
      return bar.duration;
    }
  }
  $: visibleLimit =
    $view.isPortrait || context === SessionUIContext.THIN_ON_DESKTOP ? 4 : 10;
  $: isHideSomeBars = $activeSession.intervals.length > visibleLimit;
  $: visibleBars = resolveVisibleBars($activeSession.intervals);
  function resolveVisibleBars(blocks: ISessionInterval[]) {
    // console.log({
    //   context,
    //   visibleLimit,
    //   isHideSomeBars,
    //   type: $sessionStore.type
    // });
    if (!isHideSomeBars || $activeSession.type === SessionType.COUNTUP) {
      preceedingHiddenBars = [];
      succeedingHiddenBars = [];
      return blocks;
    }
    let barInProgressIndex = blocks.findIndex(
      (x) => x.progress != 1 && x.progress != 0
    );
    if (
      barInProgressIndex === -1 &&
      $activeSession.state === SessionState.NOT_STARTED
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
      $activeSession.intervals.length - visibleLimit
    ) {
      preceedingHiddenBars = blocks.slice(0, barInProgressIndex - visibleLimit);
      succeedingHiddenBars = [];
      return blocks.slice(-visibleLimit);
    } else {
    }
  }
  function resolveWidth(bar: ISessionInterval) {
    if ($activeSession.type === SessionType.COUNTUP) {
      return (
        ($activeSession.totalElapsed
          ? (resolveCountupBarDuration(bar) ?? 0) / $activeSession.totalElapsed
          : 100) * 100
      );
    } else if (!isHideSomeBars)
      return ((bar?.duration ?? 0) / $activeSession.plannedDuration) * 100;
    return (
      ((bar.duration ?? 0) /
        visibleBars.reduce((acc, cur) => acc + cur.duration, 0)) *
      80
    );
  }
  // $: console.log({ visibleBars: deepCopy(visibleBars) });
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
