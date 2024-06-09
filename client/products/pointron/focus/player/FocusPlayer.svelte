<script lang="ts">
  import { startTouch, moveTouch } from "$lib/client/utils/touchGesture";
  import { sessionStore } from "$lib/client/products/pointron/focus/session.store";
  import { BlockType } from "$lib/client/types/pointron/session.type";
  import Icon from "$lib/client/elements/Icon.svelte";
  import { appStore, userPreferences } from "$lib/client/stores/app.store";
  import view from "$lib/client/stores/view.store";
  import { Size } from "$lib/client/types/size.enum";
  import { ColorStrength, ColorType } from "$lib/client/types/appearance.type";
  import {
    customColorStyle,
    textColorClass,
    retrieveCurrentColors
  } from "$lib/client/utils/theme.utils";
  import ControlBar from "../elements/controls/ControlBar.svelte";
  import { onMount } from "svelte";
  import FocusPlayerTimeText from "./FocusPlayerTimeText.svelte";
  import { SelectionItemActiveStyle } from "$lib/client/types/switcher.enum";
  import InlineLoadingAnimation from "$lib/client/elements/feedback/animations/InlineLoadingAnimation.svelte";
  import { SessionState } from "$lib/client/types/pointron/sessionState.enum";
  import { PointronEventEnum } from "$lib/client/types/pointron/pointronEvent.enum";
  import appearance from "$lib/client/stores/appearance.store";
  let colors = retrieveCurrentColors($appearance);
  let playerContainerRef: any;
  let player: HTMLElement | null = document.getElementById("focusplayer");
  let playerContainer: HTMLElement | null =
    document.getElementById("playercontainer");
  let isPipOn = false;
  function enableFullScreenPlayer() {
    if (isPipOn) return;
    appStore.showFullScreenPlayer(PointronEventEnum.FULL_SCREEN_FOCUS);
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
    if ($appStore.isPipOn) appStore.togglePip(PointronEventEnum.FOCUS_PLAYER);
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
  <button
    id="focusplayer"
    class="flex h-full bg-fgs2 text-bgs1 border-t border-bgs3 border-opacity-50 justify-between items-center px-4 py-2 {$view.isPortrait ||
    isPipOn
      ? 'w-full'
      : ' w-[26rem] rounded-md'} {textColorClass(
      $appearance,
      ColorStrength.Normal,
      true,
      $sessionStore.currentLog.color
    )}"
    style={customColorStyle(
      $appearance,
      ColorType.Bg,
      $sessionStore.timeRemainingToTakeBreak != undefined &&
        $sessionStore.timeRemainingToTakeBreak < 0
        ? "ars1"
        : isFocusing
          ? "aps1"
          : "ass1",
      isFocusing &&
        !(
          $sessionStore.timeRemainingToTakeBreak != undefined &&
          $sessionStore.timeRemainingToTakeBreak < 0
        )
        ? $sessionStore.currentLog.color
        : undefined
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
        <ControlBar size={Size.sm} />
        {#if !$view.isPortrait && !isPipOn}
          <Icon
            icon="pip"
            on:click={pipHandler}
            color={colors.bgs1}
            isActive={true}
            selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
            bgColorHue={$sessionStore.currentLog.color}
          />
          <Icon
            icon="chevup"
            on:click={clickHandler}
            color={colors.bgs1}
            isActive={true}
            selectionStyle={SelectionItemActiveStyle.ACCENT_BACKGROUND}
            bgColorHue={$sessionStore.currentLog.color}
          />
        {/if}
      </div>
    {/if}
  </button>
</div>
