<script lang="ts">
  import { activeSession } from "$lib/client/products/pointron/focus/session.store";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import { SessionCompositionType } from "$lib/client/types/pointron/sessionComposition.type";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { SessionType } from "$lib/client/products/pointron/logs/log.type";
  import { appStore, currentTime } from "$lib/client/stores/app.store";
  import { userPreferences } from "$lib/client/components/settings/userPreferences.store";
  import { resolveHoverState } from "$lib/client/utils/browser.utils";
  import { formatTime } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let label: "start" | "end" = "start";
  export let context: SessionUIContext = SessionUIContext.DEFAULT;
  let timeClassList = "";
  let labelClassList = "";
  let isHovering = false;
  let toolTipRef: HTMLElement;
  let tooltip: string | undefined = undefined;
  let labelRef: HTMLElement;
  onMount(() => {
    hideToolTip();
    if (context === SessionUIContext.ZEN_ON_DESKTOP) {
      timeClassList = "text-h4";
    } else if ($activeSession.state === SessionState.NOT_STARTED) {
      timeClassList = "text-base";
    } else {
      timeClassList = "text-base";
    }
    labelClassList =
      context === SessionUIContext.ZEN_ON_DESKTOP
        ? "text-b2"
        : $activeSession.state === SessionState.NOT_STARTED
          ? "text-b4"
          : "text-b3";
  });
  function toggleHoverState(event: MouseEvent | FocusEvent) {
    if (resolveHoverState(event)) {
      isHovering = true;
      if (
        $activeSession.state === SessionState.NOT_STARTED &&
        label === "end"
      ) {
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
  class={cn(
    "flex flex-col items-center min-w-fit",
    context !== SessionUIContext.PIP && "relative bottom-2.5"
  )}
  on:mouseover={toggleHoverState}
  on:mouseout={toggleHoverState}
  on:focus={toggleHoverState}
  on:blur={toggleHoverState}
>
  {#if label === "start"}
    {#if context !== SessionUIContext.PIP}
      <div class={cn("text-fgs3", labelClassList)}>
        {$activeSession.state === SessionState.NOT_STARTED
          ? "Now"
          : context != SessionUIContext.ZEN_ON_DESKTOP
            ? "Start"
            : "Start time"}
      </div>
    {/if}
    <div class={timeClassList}>
      {#if $activeSession.state == SessionState.NOT_STARTED && $currentTime}
        {formatTime($userPreferences, $currentTime)}
      {:else if $activeSession.intervals.length > 0 && $activeSession.start}
        {formatTime($userPreferences, $activeSession.start)}
      {/if}
    </div>
  {:else}
    {#if context !== SessionUIContext.PIP}
      <div class={cn("text-fgs3", labelClassList)}>
        {context != SessionUIContext.ZEN_ON_DESKTOP ? "End" : "End time"}
      </div>
    {/if}
    {#if $activeSession.state === SessionState.NOT_STARTED}
      <button
        class=" rounded-md underline-dotted border- border--dotted border--brs3 {$activeSession
          .composition?.type === SessionCompositionType.COUNTUP
          ? 'text--base px--2'
          : 'text--b3 px--2 py--[0.2rem]'}"
        on:click={() =>
          appStore.runAction(PointronAction.COMPOSE_BY_END_TIME_MODAL)}
      >
        {#if $activeSession.composition?.type === SessionCompositionType.END_TIME_FIXED && $activeSession.end}
          {formatTime($userPreferences, $activeSession.end)}
        {:else if $activeSession.composition?.type === SessionCompositionType.COUNTUP}
          <span>&nbsp; ♾️ &nbsp;</span>
        {:else}
          {formatTime(
            $userPreferences,
            new Date(
              $currentTime.getTime() + $activeSession.plannedDuration * 1000
            )
          )}
        {/if}
      </button>
    {:else}
      <div class={timeClassList}>
        {#if $activeSession.type === SessionType.COUNTUP && $activeSession.state != SessionState.FINISHED}
          {$currentTime ? formatTime($userPreferences, $currentTime) : ""}
        {:else if $activeSession.type === SessionType.COUNTUP && $activeSession.state === SessionState.FINISHED}
          <!-- {#if $sessionStore.end}
            {formatTime($userPreferences, $sessionStore.end)}
          {:else if $sessionStore.start} -->
          {#if $activeSession.start}
            {formatTime(
              $userPreferences,
              new Date(
                $activeSession.start.getTime() +
                  ($activeSession.totalElapsed + $activeSession.totalIdle) *
                    1000
              )
            )}
          {/if}
          <!-- {/if} -->
          <!-- {:else if $sessionStore.composition?.type === SessionCompositionType.END_TIME_FIXED}
          {$sessionStore.end} -->
          <!-- {:else if $sessionStore.composition?.type === SessionCompositionType.TARGET_FOCUS && $sessionStore.end}
          {formatTime($sessionStore.end)} -->
        {:else if $activeSession.start}
          {#if $activeSession.end}
            {formatTime($userPreferences, $activeSession.end)}
          {:else}
            {formatTime(
              $userPreferences,
              new Date(
                $activeSession.start.getTime() +
                  ($activeSession.plannedDuration + $activeSession.totalIdle) *
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
