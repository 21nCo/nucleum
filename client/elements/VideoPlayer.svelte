<script lang="ts">
  import Icon from "@21n/elements/Icon.svelte";
  let {
    time = $bindable(0),
    duration = $bindable(undefined),
    isPaused = $bindable(true),
    autoplay = false,
    loop = false,
    hideControls = false,
    src,
    poster = ""
  }: any = $props();
  let videoRef = $state<HTMLVideoElement>();
  let showControls = $state(true);
  let showControlsTimeout = $state<any>();
  let lastMouseDown = $state<Date>();

  function setVisibleWithTimer() {
    clearTimeout(showControlsTimeout);
    showControlsTimeout = setTimeout(() => (showControls = false), 2500);
    showControls = true;
  }

  const handleProgressMove = function (this: any, e: any) {
    if (!duration) return;
    if (e.type !== "touchmove" && !(e.buttons & 1)) return;

    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const { left, right } = this.getBoundingClientRect();
    time = (duration * (clientX - left)) / (right - left);
  };

  const handleProgressMousedown = function (this: any, e: any) {
    lastMouseDown = new Date();
    if (!duration) return;
    if (e.type !== "touchmove" && !(e.buttons & 1)) return;

    const clientX = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
    const { left, right } = this.getBoundingClientRect();
    time = (duration * (clientX - left)) / (right - left);
  };

  function handleProgressMouseup(_e: any) {}

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
      onclick={togglePauseState()}
      onmousemove={setVisibleWithTimer}
      onkeydown={handleFilledOverlayKeyDown}
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
        onmouseenter={togglePlayerVisibility(true)}
        onmouseleave={setVisibleWithTimer}
        onmousemove={handleProgressMove}
        onmousedown={handleProgressMousedown}
        onmouseup={handleProgressMouseup}
        ontouchmove={(event) => {
          event.preventDefault();
          handleProgressMove.call(event.currentTarget, event);
        }}
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
        <span
          class="time text-white py-2 px-3 text-b5 shadow-[0 0 8px black] w-[3rem]"
        >
          {format(duration)}
        </span>
      </div>
    </div>
  {/if}
</div>

<style>
  .info {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  span {
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
