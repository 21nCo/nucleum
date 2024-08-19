<script lang="ts">
  import { startTouch, moveTouch } from "$lib/client/utils/touchGesture";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { SessionUIContext } from "$lib/client/types/pointron/session.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import ControlBar from "../elements/controls/ControlBar.svelte";
  import { onMount } from "svelte";
  import FocusPlayerTimeText from "./FocusPlayerTimeText.svelte";
  import InlineLoadingAnimation from "$lib/client/elements/feedback/animations/InlineLoadingAnimation.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import context from "$lib/client/stores/context.store";
  import ThemeLayer from "$lib/client/layout/layers/themeLayer/ThemeLayer.svelte";
  import appearance from "$lib/client/stores/appearance.store";
  import IntervalBar from "../elements/intervalbar/IntervalBar.svelte";
  let playerContainerRef: any;
  let player: HTMLElement | null = document.getElementById("focusplayer");
  let playerContainer: HTMLElement | null =
    document.getElementById("playercontainer");
  let isPipOn = false;
  $: isBreakReminderMode =
    $sessionStore.timeRemainingToTakeBreak != undefined &&
    $sessionStore.timeRemainingToTakeBreak < 0;
  $: currentGoal = sessionStore.resolveCurrentGoal($sessionStore.currentTask);
  function enableFullScreenPlayer() {
    if (isPipOn) return;
    appStore.showFullScreenPlayer(PointronAction.FULL_SCREEN_FOCUS);
  }
  function clickHandler(event: any) {
    //if ($windowObject.isInPortraitMode) return;
    enableFullScreenPlayer();
  }

  function closePip() {
    if (player && $sessionStore.isSessionRunning)
      playerContainer?.append(player);
    isPipOn = false;
    if ($appStore.isPipOn) appStore.togglePip(PointronAction.FOCUS_PLAYER);
    if ("documentPictureInPicture" in window)
      (window.documentPictureInPicture as any).window?.close();
  }
  async function pipHandler(event: any) {
    event?.stopPropagation();
    if (!player) return;
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
        // Open a Picture-in-Picture window.
        const pipWindow = await (
          window.documentPictureInPicture as any
        ).requestWindow({
          width: playerContainerRef.clientWidth - 20,
          height: playerContainerRef.clientHeight + 80
        });
        pipWindow.addEventListener("pagehide", (event: any) => {
          closePip();
        });

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
        // console.log({ player });
        pipWindow.document.body.append(player);
        isPipOn = true;
      } else {
        // console.log({ player, playerContainer });
        closePip();
      }
    } catch (e) {
      console.error(e);
    }
  }
  onMount(() => {
    player = document.getElementById("focusplayer");
    playerContainer = document.getElementById("playercontainer");
    const sessionSub = sessionStore.subscribe((x) => {
      if (x.state === SessionState.FINISHED) {
        closePip();
      }
    });
    const sub = appStore.subscribe((app) => {
      if (app.isPipOn && !isPipOn) {
        pipHandler(null);
      } else if (!app.isPipOn && isPipOn) {
        closePip();
      }
    });
    return () => {
      sub();
      sessionSub();
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
  class={!$view.isPortrait ? "m-6" : "w-full"}
  bind:this={playerContainerRef}
>
  <div
    id="focusplayer"
    class={cn("flex w-full h-full", $appearance.colorScheme.tailwindSelector, {
      "text-base text-fgs1": isPipOn,
      "bg-bgs1": isPipOn && !isBreakReminderMode,
      "bg-ars1 animate--pulse animate-pulse-subtle":
        isBreakReminderMode && isPipOn
    })}
    style="font-family: {$appearance.typeface ?? 'Avenir'};"
  >
    <ThemeLayer extensionContext={isPipOn ? "focusplayer" : undefined}>
      <div class="flex flex-col gap-1 w-full">
        <CustomColorPropagator
          type="button"
          color={currentGoal?.color}
          class={cn(
            "flex h-full justify-between items-center px-4 py-2",
            isPipOn && {
              "text-abg": isBreakReminderMode,
              "bg-bgs2 dark:bg-[#202124]": !isBreakReminderMode
            },
            !isPipOn && {
              "border-t border-bgs3 border-opacity-50": true,
              "w-full": $view.isPortrait,
              "w-[26rem] rounded-md": !$view.isPortrait,
              "bg-ars1 text-abg": isBreakReminderMode,
              "bg-ccs1 text-cbg":
                $sessionStore.state === SessionState.FOCUS_RUNNING &&
                !isBreakReminderMode,
              "bg-ass1 text-abg":
                $sessionStore.state != SessionState.FOCUS_RUNNING
            },
            isPipOn && {
              "w-full": true
            }
          )}
          on:click={clickHandler}
        >
          {#if $sessionStore.state === SessionState.FINISHED}
            <div class="flex w-full h-12 justify-center items-center">
              <InlineLoadingAnimation />Finishing session...
            </div>
          {:else}
            <div class="flex items-center gap-4 h-full">
              <FocusPlayerTimeText
                context={isPipOn
                  ? SessionUIContext.PIP
                  : SessionUIContext.FOCUS_PLAYER}
              />
            </div>
            <div class="flex gap-4">
              <ControlBar
                context={isPipOn
                  ? SessionUIContext.PIP
                  : SessionUIContext.FOCUS_PLAYER}
              />
              {#if !$view.isPortrait && !isPipOn}
                {#if !$context.isEmbed}
                  <Icon
                    icon="pip"
                    on:click={pipHandler}
                    isTabbable={true}
                    class={cn({
                      "stroke-cbg":
                        $sessionStore.state === SessionState.FOCUS_RUNNING &&
                        !isBreakReminderMode,
                      "stroke-abg":
                        isBreakReminderMode ||
                        $sessionStore.state != SessionState.FOCUS_RUNNING
                    })}
                  />
                {/if}

                <Icon
                  icon="chevup"
                  on:click={clickHandler}
                  isTabbable={true}
                  class={cn({
                    "stroke-cbg":
                      $sessionStore.state === SessionState.FOCUS_RUNNING &&
                      !isBreakReminderMode,
                    "stroke-abg":
                      isBreakReminderMode ||
                      $sessionStore.state != SessionState.FOCUS_RUNNING
                  })}
                />
              {/if}
            </div>
          {/if}
        </CustomColorPropagator>
        {#if isPipOn}
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
