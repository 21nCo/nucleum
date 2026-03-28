<script lang="ts">
  import { startTouch, moveTouch } from "@21n/utils/touchGesture";
  import {
    activeSession,
    currentFocusItem
  } from "@21n/products/pointron/focus/session.store";
  import { SessionUIContext } from "@21n/types/pointron/session.type";
  import Icon from "@21n/elements/Icon.svelte";
  import view from "@21n/stores/view.store";
  import ControlBar from "@21n/products/pointron/focus/elements/controls/ControlBar.svelte";
  import { onMount } from "svelte";
  import FocusPlayerTimeText from "@21n/products/pointron/focus/player/FocusPlayerTimeText.svelte";
  import InlineLoadingAnimation from "@21n/elements/feedback/animations/InlineLoadingAnimation.svelte";
  import { SessionState } from "@21n/types/pointron/sessionState.enum";
  import { PointronAction } from "@21n/types/pointron/pointronAction.enum";
  import { cn } from "@21n/utils/ui.utils";
  import CustomColorPropagator from "@21n/elements/style/CustomColorPropagator.svelte";
  import context from "@21n/stores/context.store";
  import ThemeLayer from "@21n/layout/layers/themeLayer/ThemeLayer.svelte";
  import appearance, {
    fallBackTypefaceString
  } from "@21n/stores/appearance.store";
  import IntervalBar from "@21n/products/pointron/focus/elements/intervalbar/IntervalBar.svelte";
  import { fullScreen, player } from "@21n/components/modal/modal.store";
  import { logger } from "@21n/components/debug/logger.client";
  import { isSameResource } from "@21n/components/flux/resourceStores/resource.utils";
  import { resolveGoalColor } from "@21n/components/goals/goal.utils";
  import { hoverable } from "@21n/actions/hover.action";
  import { tooltip } from "@21n/actions/popover.action";
  import type { IGoalThumb } from "@21n/components/goals/goal.type";
  import type { ITaskThumb } from "@21n/components/tasks/task.type";
  import { wait } from "@21n/utils/time.utils";
  let playerContainerRef: any;
  let playerRef: HTMLElement | null = document.getElementById("focusplayer");
  let playerContainer: HTMLElement | null =
    document.getElementById("playercontainer");
  let isPipShown = false;
  let hoverState = {
    caretHovering: false,
    pipHovering: false
  };
  let isRenderPip: boolean = false;
  let curentFocusItemExpanded: ITaskThumb | IGoalThumb | undefined = undefined;
  $: isBreakReminderMode =
    $activeSession.timeRemainingToTakeBreak != undefined &&
    $activeSession.timeRemainingToTakeBreak < 0;

  function enableFullScreenPlayer() {
    if (isPipShown) return;
    fullScreen.show(PointronAction.FULL_SCREEN_FOCUS);
  }
  function clickHandler(event: any) {
    //if ($windowObject.isInPortraitMode) return;
    enableFullScreenPlayer();
  }

  function resolveCurrentFocusItemGoal(
    item: ITaskThumb | IGoalThumb | undefined
  ): IGoalThumb | undefined {
    if (!item) return undefined;
    if ("goal" in item) {
      return item.goal as IGoalThumb | undefined;
    }
    return item as IGoalThumb;
  }

  function closePip() {
    if (playerRef && $activeSession.isSessionRunning)
      playerContainer?.append(playerRef);
    isPipShown = false;
    isRenderPip = false;
    if ($player.isPipOn) {
      player.togglePip(PointronAction.FOCUS_PLAYER);
    }
    if (pipWindowRef && pipWindowPageHideHandler) {
      try {
        pipWindowRef.removeEventListener("pagehide", pipWindowPageHideHandler);
      } catch (e) {
        logger.error({ at: "closePip:removeEventListener", e });
      }
    }
    pipWindowPageHideHandler = null;
    if ("documentPictureInPicture" in window)
      (window.documentPictureInPicture as any).window?.close();
    pipWindowRef = null;
  }
  let pipWindowRef: any = null;
  let pipWindowPageHideHandler: ((event: any) => void) | null = null;
  async function showPip(event: any) {
    event?.stopPropagation();
    if (!playerRef) return;
    try {
      if (
        "documentPictureInPicture" in window &&
        !window.documentPictureInPicture
      )
        return;
      if (
        "documentPictureInPicture" in window &&
        !(window.documentPictureInPicture as any).window
      ) {
        const pipWindow = await (
          window.documentPictureInPicture as any
        ).requestWindow({
          width: playerContainerRef.clientWidth - 20,
          height: playerContainerRef.clientHeight + 80
        });
        pipWindowPageHideHandler = (_event: any) => {
          closePip();
        };
        pipWindow.addEventListener("pagehide", pipWindowPageHideHandler);
        pipWindowRef = pipWindow;

        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules]
              .map((rule) => rule.cssText)
              .join("");
            const style = document.createElement("style");

            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch (e) {
            const link = document.createElement("link");

            link.rel = "stylesheet";
            link.type = styleSheet.type;
            // link.media = styleSheet.media;
            // link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        });
        pipWindow.document.body.append(playerRef);
        pipWindow.document.body.style.height = "100vh";
        pipWindow.document.body.style.width = "100vw";
        isPipShown = true;
      } else {
        closePip();
      }
    } catch (e) {
      logger.error({ at: "pipHandler", e });
    }
  }
  onMount(() => {
    playerRef = document.getElementById("focusplayer");
    playerContainer = document.getElementById("playercontainer");
    const sessionSub = activeSession.subscribe(async (x) => {
      if (
        x.state === SessionState.FINISHED ||
        x.state === SessionState.NOT_STARTED
      ) {
        closePip();
      }
    });
    const currentFocusItemSub = currentFocusItem.subscribe(async (x) => {
      if (
        (x &&
          curentFocusItemExpanded &&
          !isSameResource(curentFocusItemExpanded, x)) ||
        !x ||
        (x && !curentFocusItemExpanded)
      ) {
        if (x) {
          curentFocusItemExpanded =
            await activeSession.resolveCurrentFocusItemData({
              item: x,
              isReturnGoalIfTask: true
            });
        } else {
          curentFocusItemExpanded = undefined;
        }
      }
    });
    const sub = player.subscribe(async (x) => {
      if (x.isPipOn && !isPipShown) {
        isRenderPip = true;
        await wait(100);
        showPip(null);
      } else if (!x.isPipOn && isPipShown) {
        closePip();
      }
    });
    return () => {
      sub();
      sessionSub();
      currentFocusItemSub();
    };
  });
</script>

<div
  on:touchstart|stopPropagation={startTouch}
  on:touchmove|stopPropagation={() =>
    moveTouch(
      event,
      enableFullScreenPlayer,
      undefined,
      undefined,
      undefined,
      20
    )}
  id="playercontainer"
  class={!$view.isPortrait ? "m--6" : "w-full"}
  bind:this={playerContainerRef}
>
  <div
    id="focusplayer"
    class={cn("flex h-full w-full", $appearance.colorScheme.tailwindSelector, {
      "text-base text-fgs1": isPipShown,
      "bg-bgs1": isPipShown && !isBreakReminderMode,
      "bg-ars1 animate--pulse animate-pulse-subtle":
        isBreakReminderMode && isPipShown
    })}
    style={isPipShown
      ? "font-family: {$appearance.typeface ?? fallBackTypefaceString};"
      : ""}
  >
    <ThemeLayer extensionContext={isPipShown ? "focusplayer" : undefined}>
      <div
        class={cn("flex flex-col gap-1 w-full", {
          hidden: !isRenderPip && !$view.isConstrainedWidth,
          "opacity-0": isRenderPip && !isPipShown
        })}
      >
        <CustomColorPropagator
          type="button"
          color={resolveGoalColor(resolveCurrentFocusItemGoal(curentFocusItemExpanded))}
          class={cn(
            "flex gap-2 h-full justify-between items-center px-4 py-2",
            isPipShown && {
              "text-abg": isBreakReminderMode,
              "bg-bgs2 dark:bg-[#202124]": !isBreakReminderMode
            },
            !isPipShown && {
              "border-t border-bgs3 border-opacity-50": true,
              "w-full": $view.isPortrait,
              "w-[26rem] rounded-md": !$view.isPortrait,
              "bg-ars1 text-abg": isBreakReminderMode,
              "bg-ccs1 text-cbg":
                $activeSession.state === SessionState.FOCUS_RUNNING &&
                !isBreakReminderMode,
              "bg-ass1 text-abg":
                $activeSession.state != SessionState.FOCUS_RUNNING
            },
            isPipShown && {
              "w-full": true
            }
          )}
          on:click={clickHandler}
        >
          {#if $activeSession.state === SessionState.FINISHED}
            <div class="flex w-full h-12 justify-center items-center">
              <InlineLoadingAnimation />Finishing session...
            </div>
          {:else}
            <div class="flex items-center gap-4 h-full flex-1 min-w-0">
              <FocusPlayerTimeText
                context={isPipShown
                  ? SessionUIContext.PIP
                  : SessionUIContext.FOCUS_PLAYER}
              />
            </div>
            <div class="flex gap-4">
              <ControlBar
                context={isPipShown
                  ? SessionUIContext.PIP
                  : SessionUIContext.FOCUS_PLAYER}
              />
              {#if !$view.isPortrait && !isPipShown}
                {#if !$context.isEmbed}
                  <button
                    class="flex items-center justify-center"
                    on:click|stopPropagation={(event) => {
                      player.togglePip(PointronAction.FOCUS_PLAYER);
                    }}
                    use:hoverable={{
                      onHover: (v) => {
                        hoverState.pipHovering = v;
                      }
                    }}
                    use:tooltip={{
                      text: "Picture in Picture"
                    }}
                  >
                    <Icon
                      icon="pip"
                      isTabbable={true}
                      isFilled={hoverState.pipHovering}
                      class={cn({
                        "stroke-cbg":
                          $activeSession.state === SessionState.FOCUS_RUNNING &&
                          !isBreakReminderMode,
                        "stroke-abg":
                          isBreakReminderMode ||
                          $activeSession.state != SessionState.FOCUS_RUNNING
                      })}
                    />
                  </button>
                {/if}
                <div
                  class="flex justify-center items-center"
                  use:hoverable={{
                    onHover: (v) => {
                      hoverState.caretHovering = v;
                    }
                  }}
                  use:tooltip={{
                    text: "Full screen"
                  }}
                >
                  <Icon
                    icon="chevron-up"
                    on:click={clickHandler}
                    isTabbable={true}
                    isFilled={hoverState.caretHovering}
                    class={cn({
                      "stroke-cbg":
                        $activeSession.state === SessionState.FOCUS_RUNNING &&
                        !isBreakReminderMode,
                      "stroke-abg":
                        isBreakReminderMode ||
                        $activeSession.state != SessionState.FOCUS_RUNNING
                    })}
                  />
                </div>
              {/if}
            </div>
          {/if}
        </CustomColorPropagator>
        {#if isPipShown}
          <div
            class={cn("flex w-full flex-1 px-4 pb-2", {
              "text-abg": isBreakReminderMode
            })}
          >
            <IntervalBar context={SessionUIContext.PIP} />
          </div>
        {/if}
      </div>
    </ThemeLayer>
  </div>
</div>
