<script lang="ts">
  import Button from "./Button.svelte";
  let isVideoPlaying = false;
  export let videoUrl: string;
  export let thumbnailUrl: string;
  function playVideo() {
    isVideoPlaying = true;
  }
</script>

<div class="flex w-full justify-center -mt-[80px] dp:-mt-[100px] max-w-full">
  <div
    class="relative w-[1046px] mo:w-[343px] h-[590px] mo:h-[194px] rounded-xl max-w-full m-4 border-[16px] border-bgs2 outline outline-bgs1 shadow-lg"
  >
    {#if !isVideoPlaying}
      <img
        src={thumbnailUrl}
        alt="Video Thumbnail"
        class="w-full h-full object-cover cursor-pointer rounded-md"
      />
      <div class="absolute inset-0 flex items-center justify-center">
        <Button
          on:click={playVideo}
          icon="play"
          class="pl-6 pr-8"
          iconPosition="end"
        />
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
