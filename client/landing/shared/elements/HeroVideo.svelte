<script lang="ts">
  import SvgIcon from "@21n/elements/SVGIcon.svelte";
  let isVideoPlaying = false;
  export let videoUrl: string;
  export let thumbnailUrl: string | undefined = undefined;
  function playVideo() {
    isVideoPlaying = true;
  }
</script>

<div class="flex w-full justify-center -mt-[80px] dp:-mt-[240px] max-w-full">
  <div
    class="relative dp:w-[60vw] 2k:w-[80vw] max-w-[1500px] mo:w-[343px] h-[50vh] mo:h-[194px] rounded-xl m-4 border-[16px] border-bgs2 outline outline-bgs1 shadow-lg"
  >
    {#if !isVideoPlaying && thumbnailUrl}
      <img
        src={thumbnailUrl}
        alt="Video Thumbnail"
        class="w-full h-full object-cover cursor-pointer rounded-md"
      />
      <div
        class="absolute inset-0 bg-fgs2 bg-opacity-30 rounded-xl flex items-center justify-center"
      >
        <button
          on:click={playVideo}
          class="w-[72px] h-[48px] bg-bgs1 flex items-center justify-center rounded-md"
        >
          <SvgIcon icon="play" />
        </button>
      </div>
    {:else}
      <iframe
        class="w-full h-full"
        src={videoUrl}
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    {/if}
  </div>
</div>
