<script lang="ts">
  import { startTouch, moveTouch } from "$lib/client/utils/touchGesture";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { BlockType } from "$lib/client/types/pointron/session.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import ControlBar from "../elements/controls/ControlBar.svelte";
  import { onMount } from "svelte";
  import FocusPlayerTimeText from "./FocusPlayerTimeText.svelte";
  import InlineLoadingAnimation from "$lib/client/elements/feedback/animations/InlineLoadingAnimation.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { PointronAction } from "$lib/client/types/pointron/pointronAction.enum";
  import { cn } from "$lib/client/utils/ui.utils";
  import CustomColorPropagator from "$lib/client/elements/style/CustomColorPropagator.svelte";
  import context from "$lib/client/stores/context.store";
  let playerContainerRef: any;
  let player: HTMLElement | null = document.getElementById("focusplayer");
  let playerContainer: HTMLElement | null =
    document.getElementById("playercontainer");
  let isPipOn = false;
  $: isBreakReminderMode =
    $sessionStore.timeRemainingToTakeBreak != undefined &&
    $sessionStore.timeRemainingToTakeBreak < 0;
  function enableFullScreenPlayer() {
    if (isPipOn) return;
    appStore.showFullScreenPlayer(PointronAction.FULL_SCREEN_FOCUS);
  }
  function clickHandler(event: any) {
    //if ($windowObject.isInPortraitMode) return;
    enableFullScreenPlayer();
  }
  $: isFocusing = $sessionStore.currentBlock.type == BlockType.FOCUS;

  function closePip() {
    if (player && $sessionStore.isSessionRunning)
      playerContainer?.append(player);
    isPipOn = false;
    if ($appStore.isPipOn) appStore.togglePip(PointronAction.FOCUS_PLAYER);
    if ("documentPictureInPicture" in window)
      (window.documentPictureInPicture as any).window.close();
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
          width: playerContainerRef.clientWidth - 30,
          height: playerContainerRef.clientHeight + 20
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
    const sub = appStore.subscribe((app) => {
      if (app.isPipOn && !isPipOn) {
        pipHandler(null);
      } else if (!app.isPipOn && isPipOn) {
        closePip();
      }
    });
    return () => {
      sub();
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
  <CustomColorPropagator
    type="button"
    color={$sessionStore.currentLog.color}
    id="focusplayer"
    class={cn(
      "flex h-full border-t border-bgs3 border-opacity-50 justify-between items-center px-4 py-2",
      {
        "w-full": $view.isPortrait || isPipOn,
        "w-[26rem] rounded-md": !($view.isPortrait || isPipOn),
        "bg-ars1 text-abg": isBreakReminderMode,
        "bg-ccs1 text-cbg": isFocusing && !isBreakReminderMode,
        "bg-ass1 text-abg": !isFocusing
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
        <!-- <div
  class="h-14 w-1 rounded-full"
  style={`background-color: ${
    $sessionStore.currentBlock.type == BlockType.FOCUS
      ? $sessionStore.currentLog.color ?? defaultFocusColor
      : breakColor
  };`}
/> -->
        <FocusPlayerTimeText />
      </div>

      <div class="flex gap-4">
        <ControlBar isFocusPlayerContext={true} />
        {#if !$view.isPortrait && !isPipOn}
          {#if !$context.isEmbed}
            <Icon
              icon="pip"
              on:click={pipHandler}
              class={cn({
                "stroke-cbg": isFocusing && !isBreakReminderMode,
                "stroke-abg": isBreakReminderMode || !isFocusing
              })}
            />
          {/if}
          <Icon
            icon="chevup"
            on:click={clickHandler}
            class={cn({
              "stroke-cbg": isFocusing && !isBreakReminderMode,
              "stroke-abg": isBreakReminderMode || !isFocusing
            })}
          />
        {/if}
      </div>
    {/if}
  </CustomColorPropagator>
</div>
