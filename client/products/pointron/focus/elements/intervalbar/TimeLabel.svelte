<script lang="ts">
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { IntervalBarContext } from "$lib/client/types/pointron/session.type";
  import { SessionCompositionType } from "$lib/client/types/pointron/sessionComposition.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import {
    appStore,
    currentTime,
    userPreferences
  } from "$lib/client/stores/app.store";
  import { resolveHoverState } from "$lib/client/utils/browser.utils";
  import { formatTime } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  export let label: "start" | "end" = "start";
  export let context: IntervalBarContext = IntervalBarContext.DEFAULT;
  let timeClassList = "";
  let labelClassList = "";
  let isHovering = false;
  let toolTipRef: HTMLElement;
  let tooltip: string | undefined = undefined;
  let labelRef: HTMLElement;
  onMount(() => {
    hideToolTip();
    if (context === IntervalBarContext.ZEN_ON_DESKTOP) {
      timeClassList = "text-h4";
    } else if ($sessionStore.state === SessionState.NOT_STARTED) {
      timeClassList = "text-base";
    } else {
      timeClassList = "text-base";
    }
    labelClassList =
      context === IntervalBarContext.ZEN_ON_DESKTOP
        ? "text-b2 -top-2/3"
        : $sessionStore.state === SessionState.NOT_STARTED
          ? "text-b4 -top-2/3"
          : "text-b3 -top-full";
  });
  function toggleHoverState(event: MouseEvent | FocusEvent) {
    if (resolveHoverState(event)) {
      isHovering = true;
      if ($sessionStore.state === SessionState.NOT_STARTED && label === "end") {
        tooltip =
          "Click this to fix the end time of the session and calculate duration accordingly.";
        // if (labelRef && toolTipRef)
        //   renderPopoverv2(labelRef, toolTipRef, Direction.Down);
      }
    } else {
      isHovering = false;
      tooltip === undefined;
      hideToolTip();
    }
  }
  function hideToolTip() {
    if (toolTipRef && toolTipRef?.style?.display != "none")
      toolTipRef.style.display = "none";
  }
</script>

<div
  bind:this={labelRef}
  class="relative flex flex-col items-center min-w-fit"
  on:mouseover={toggleHoverState}
  on:mouseout={toggleHoverState}
  on:focus={toggleHoverState}
  on:blur={toggleHoverState}
>
  {#if label === "start"}
    <div class="absolute text-fgs3 left-0 {labelClassList}">
      {$sessionStore.state === SessionState.NOT_STARTED
        ? "Now"
        : context != IntervalBarContext.ZEN_ON_DESKTOP
          ? "Start"
          : "Start time"}
    </div>
    <div class={timeClassList}>
      {#if $sessionStore.state == SessionState.NOT_STARTED && $currentTime}
        {formatTime($userPreferences, $currentTime)}
      {:else if $sessionStore.blocks.length > 0 && $sessionStore.start}
        {formatTime($userPreferences, $sessionStore.start)}
      {/if}
    </div>
  {:else}
    <div class="absolute text-fgs3 right-0 {labelClassList}">
      {context != IntervalBarContext.ZEN_ON_DESKTOP ? "End" : "End time"}
    </div>
    {#if $sessionStore.state === SessionState.NOT_STARTED}
      <button
        class=" rounded-md underline-dotted border- border--dotted border--brs3 {$sessionStore
          .composition?.type === SessionCompositionType.COUNTUP
          ? 'text--base px--2'
          : 'text--b3 px--2 py--[0.2rem]'}"
        on:click={() =>
          appStore.runAction(PointronAction.COMPOSE_BY_END_TIME_MODAL)}
      >
        {#if $sessionStore.composition?.type === SessionCompositionType.END_TIME_FIXED && $sessionStore.end}
          {formatTime($userPreferences, $sessionStore.end)}
        {:else if $sessionStore.composition?.type === SessionCompositionType.COUNTUP}
          <span>&nbsp; ♾️ &nbsp;</span>
        {:else}
          {formatTime(
            $userPreferences,
            new Date(
              $currentTime.getTime() + $sessionStore.plannedDuration * 1000
            )
          )}
        {/if}
      </button>
    {:else}
      <div class={timeClassList}>
        {#if $sessionStore.type === SessionType.COUNTUP}
          {$currentTime ? formatTime($userPreferences, $currentTime) : ""}
          <!-- {:else if $sessionStore.composition?.type === SessionCompositionType.END_TIME_FIXED}
          {$sessionStore.end} -->
          <!-- {:else if $sessionStore.composition?.type === SessionCompositionType.TARGET_FOCUS && $sessionStore.end}
          {formatTime($sessionStore.end)} -->
        {:else if $sessionStore.start}
          {#if $sessionStore.end}
            {formatTime($userPreferences, $sessionStore.end)}
          {:else}
            {formatTime(
              $userPreferences,
              new Date(
                $sessionStore.start.getTime() +
                  ($sessionStore.plannedDuration + $sessionStore.totalIdle) *
                    1000
              )
            )}
          {/if}
        {/if}
      </div>
    {/if}
  {/if}
  <!-- {#if tooltip}
    <div bind:this={toolTipRef}>
      <Tooltip info={{ body: tooltip }} />
    </div>
  {/if} -->
</div>
