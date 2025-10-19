<script lang="ts">
  import { IconVariant } from "@21n/types/icon.type";
  import Icon from "@21n/elements/Icon.svelte";

  export let time = 0;
  export let duration: number;
  export let isPaused = true;
  export let autoplay: boolean = false;
  export let loop: boolean = false;

  export let hideControls: boolean = false;

  export let src: string;
  export let poster: string = "";

  let videoRef: HTMLVideoElement;
  let showControls = true;
  let showControlsTimeout: any;

  // Used to track time of last mouse down event
  let lastMouseDown: Date;

  function setVisibleWithTimer() {
    clearTimeout(showControlsTimeout);
    showControlsTimeout = setTimeout(() => (showControls = false), 2500);
    showControls = true;
  }

  const handleProgressMove = function (this: any, e: any) {
    // Make the controls visible, but fade out after
    // 2.5 seconds of inactivity
    if (!duration) return; // video not loaded yet
    if (e.type !== "touchmove" && !(e.buttons & 1)) return; // mouse not down

    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const { left, right } = this.getBoundingClientRect();
    time = (duration * (clientX - left)) / (right - left);
  };

  // we can't rely on the built-in click event, because it fires
  // after a drag — we have to listen for clicks ourselves
  const handleProgressMousedown = function (this: any, e: any) {
    console.log("Handle Progress Mouse Down");
    lastMouseDown = new Date();
    if (!duration) return; // video not loaded yet
    if (e.type !== "touchmove" && !(e.buttons & 1)) return; // mouse not down

    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const { left, right } = this.getBoundingClientRect();
    time = (duration * (clientX - left)) / (right - left);
  };

  function handleProgressMouseup(e: any) {
    console.log("Handle Progress Mouse Up");
    // if (Number(new Date()) - Number(lastMouseDown) < Number(250) && isPaused) {
    //   videoRef.play();
    // }
    // if (isPaused) videoRef.play();
    // else videoRef.pause();
  }

  function togglePauseState(isPausedLocal?: boolean) {
    return (e?: any) => {
      if (isPausedLocal !== undefined && isPausedLocal !== null) {
        if (isPausedLocal) videoRef.play();
        else videoRef.pause();
      } else if (isPaused) {
        videoRef.play();
      } else {
        videoRef.pause();
      }
    };
  }

  function handleFilledOverlayKeyDown(e: KeyboardEvent) {
    if (e.key === " ") {
      togglePauseState(isPaused)(e);
    }
  }

  function togglePlayerVisibility(isVisible?: boolean) {
    return () => {
      if (isVisible) {
        clearTimeout(showControlsTimeout);
        showControls = true;
      } else {
        showControls = !showControls;
      }
    };
  }

  function format(seconds: any) {
    if (isNaN(seconds)) return "...";

    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    if (seconds < 10) seconds = "0" + seconds;

    return `${minutes}:${seconds}`;
  }

  $: {
    console.log({ isPaused });
  }
</script>

<div class="relative overflow-hidden">
  <video
    class="cursor-pointer"
    {poster}
    {src}
    bind:this={videoRef}
    bind:currentTime={time}
    bind:duration
    bind:paused={isPaused}
    {autoplay}
    {loop}
  >
    <track kind="captions" />
  </video>
  {#if !hideControls}
    <div
      on:click={togglePauseState()}
      on:mousemove={setVisibleWithTimer}
      on:keydown={handleFilledOverlayKeyDown}
      class="absolute w-full h-full flex cursor-pointer items-center justify-center top-0"
    >
      {#if isPaused}
        <div class="bg-[#A19BEC47] p-3 rounded-full">
          <div class="bg-[#383E47] w-fit p-3 rounded-full">
            <Icon icon="play" />
          </div>
        </div>
      {:else if duration && showControls}
        <div class="bg-[#A19BEC47] p-3 rounded-full">
          <div class="bg-[#383E47] w-fit p-3 rounded-full">
            <Icon icon="pause" />
          </div>
        </div>
      {/if}
    </div>

    <div
      class={`controls absolute backdrop-blur-sm bottom-0 w-full transition-all ${
        duration && showControls
          ? `translate-y-[0]`
          : `translate-y-[calc(100%-2px)]`
      }`}
    >
      <div
        class="py-1 cursor-pointer"
        on:mouseenter={togglePlayerVisibility(true)}
        on:mouseleave={setVisibleWithTimer}
        on:mousemove={handleProgressMove}
        on:mousedown={handleProgressMousedown}
        on:mouseup={handleProgressMouseup}
        on:touchmove|preventDefault={handleProgressMove}
      >
        <progress
          class={`w-full transition-all ${
            duration && showControls ? `h-[5px] ` : `h-[2px]`
          }`}
          value={time / duration || 0}
        />
      </div>
      <div class={`info relative transition-all`}>
        <span
          class="time text-white py-2 px-3 text-b5 shadow-[0 0 8px black] w-[3rem]"
        >
          {format(time)}
        </span>
        <!-- <span>click anywhere to {paused ? "play" : "pause"} / drag to seek</span> -->
        <span
          class="time text-white py-2 px-3 text-b5 shadow-[0 0 8px black] w-[3rem]"
        >
          {format(duration)}
        </span>
      </div>
    </div>
  {/if}
</div>

<!-- 
    Note :
    - Need to add click on track to seek, and same on keydown
-->

<style>
  .info {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  span {
    /* padding: 0.2em 0.5em; */
    /* color: white; */
    /* text-shadow: ; */
    opacity: 0.7;
  }

  .time:last-child {
    text-align: right;
  }

  progress {
    display: block;
    -webkit-appearance: none;
    appearance: none;
  }

  progress::-webkit-progress-bar {
    background-color: rgba(0, 0, 0, 0.2);
  }

  progress::-webkit-progress-value {
    background-color: #575ad5;
  }

  video {
    width: 100%;
  }
</style>
