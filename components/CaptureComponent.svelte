<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../elements/Icon.svelte";
  import { HapticFeedback } from "../types/haptic.enum";
  import { IconVariant } from "../types/icon.type";
  import { Size } from "../types/size.enum";
  import { hapticFeedback, postMessageToParent } from "../utils/embed.utils";
  import { EmbedMessage } from "../types/embedMessage.enum";
  type restrictedlengthArray = [string, string, string, string];
  export let IconsList: restrictedlengthArray = [
    "play",
    "camera",
    "video-camera",
    "music"
  ];
  let touchAndHold = false;
  let fingerId: string;
  let timerId: any;
  let startedOnClick: boolean = false;
  let iconClicked: string;
  let touchY: any;
  let containerTouchY: number;
  let rem: number;
  let captureButtonTop: any;
  $: if (touchY && touchAndHold) {
    let [top, , ,] = getCurrentPosition("captureIconsHolder");
    if (top) top += 1.37 * rem; //1.37rem is half the height of the capture button
    if (touchY > (top ?? 10000)) {
      containerTouchY = touchY;
      let flag = false;
      IconsList.forEach((icon) => {
        if (!flag && isFingerHere(icon)) {
          fingerId = icon;
          flag = true;
        }
      });
      if (!flag) {
        fingerId = "";
      }
    }
  }
  /**
   *
   * @param event
   * check if touch and hold, then slidesUp the list and sets touchY only after slideupAnimation is complete
   */
  function handleTouchStart(event: TouchEvent) {
    timerId = setTimeout(() => {
      if (startedOnClick) return;
      touchAndHold = true;
      setTimeout(() => {
        touchY = event.touches[0].clientY;
      }, 300);
      hapticFeedback(HapticFeedback.PRESSANDHOLD);
    }, 200);
  }
  function handleTouchMove(event: TouchEvent) {
    if (startedOnClick) return;
    touchY = event.touches[0].clientY;
  }
  function handleTouchEnd() {
    clearTimeout(timerId);
    touchAndHold = startedOnClick ? touchAndHold : false;
    containerTouchY = captureButtonTop + 1.37 * rem ?? 0;
    if (IconsList.includes(fingerId)) {
      // emit event for fingerId(i.e.,icon) here
      triggerAction(fingerId);
    }
    touchY = null;
    fingerId = "";
  }
  function getCurrentPosition(id: string) {
    const element = document.getElementById(id);
    const rect = element?.getBoundingClientRect();
    return [rect?.top, rect?.right, rect?.bottom, rect?.left];
  }
  function isCloserProximity(touchY: number, y: number = 10000): boolean {
    const distance = touchY - y;
    return distance < 30 && distance > 10;
  }
  function isFingerHere(id: string) {
    let [y, , , x] = getCurrentPosition(id);
    return isCloserProximity(touchY, y);
  }
  function handleIconClick(icon: string) {
    iconClicked = icon;
    triggerAction(icon);
    setTimeout(() => {
      iconClicked = "";
      touchAndHold = false;
      startedOnClick = false;
    }, 100);
  }
  function triggerAction(icon: string) {
    if (!icon.includes("camera")) return;
    console.log("Camera triggered");
    postMessageToParent(EmbedMessage.CAMERA);
  }
  onMount(() => {
    rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    [captureButtonTop, , ,] = getCurrentPosition("capture");
    containerTouchY = captureButtonTop + 1.37 * rem ?? 0;
  });
</script>

<div class="flex flex-col relative">
  <div
    id="captureIconsHolder"
    class="w-14 border-0 border-b-0 rounded-t-full absolute bottom-full {touchAndHold
      ? 'slideUp'
      : 'slideDown'}"
    style="background-color: #2c70dd;"
  >
    {#each IconsList as icon}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        id={icon}
        on:click={() => handleIconClick(icon)}
        class="flex justify-center items-center h-1/4"
      >
        <Icon
          {icon}
          color="white"
          size={fingerId == icon || (startedOnClick && iconClicked !== icon)
            ? Size.md
            : Size.sm}
        />
      </div>
    {/each}
  </div>

  <div
    id="highlightCircleForCapture"
    style={`position:absolute;margin-left:${0.4 * rem}px; ${
      touchAndHold && !startedOnClick
        ? `top:-${captureButtonTop - containerTouchY + 1.37 * rem}px;`
        : `visibility:hidden;`
    }`}
  >
    <div class="w-11 h-11 border-2 rounded-full border-white"></div>
  </div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    id="capture"
    class="z-10"
    style={touchAndHold ? "opacity:0" : ""}
    on:touchstart|stopPropagation={(event) => {
      handleTouchStart(event);
    }}
    on:touchmove|stopPropagation={(event) => handleTouchMove(event)}
    on:touchend|stopPropagation={() => {
      handleTouchEnd();
    }}
    on:click={() => {
      startedOnClick = !startedOnClick;
      touchAndHold = !touchAndHold;
    }}
  >
    <Icon
      icon="capture2.0"
      size={Size.xxl}
      variant={touchAndHold ? IconVariant.Mini : IconVariant.Outline}
    />
  </div>
</div>

<style>
  @keyframes animeSlideUp {
    0% {
      height: 0;
    }
    100% {
      height: 20vh;
    }
  }
  @keyframes animeSlideDown {
    0% {
      height: 20vh;
    }
    100% {
      visibility: hidden;
      height: 0;
    }
  }
  .slideUp {
    animation: animeSlideUp 0.3s ease-in-out forwards;
  }
  .slideUp::after {
    content: "";
    display: block;
    width: 3.5rem;
    height: 3.8rem;
    border-bottom-left-radius: 9999px;
    border-bottom-right-radius: 9999px;
    background-color: #2c70dd;
  }
  .slideDown::after {
    content: "";
    display: block;
    width: 3.5rem;
    height: 3.8rem;
    border-bottom-left-radius: 9999px;
    border-bottom-right-radius: 9999px;
    background-color: #2c70dd;
  }
  .slideDown {
    /* visibility: hidden;
    height: 0; */
    animation: animeSlideDown 0.3s ease-in forwards; /* if applied intial render will contain the animation */
  }
</style>
