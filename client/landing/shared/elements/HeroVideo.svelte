<script lang="ts">
  import Button from "./Button.svelte";
  let isVideoPlaying = false;
  function playVideo() {
    isVideoPlaying = true;
  }
</script>

<div class="flex w-full justify-center -mt-[80px] dp:-mt-[100px]">
  <div
    class="relative w-[1046px] mo:w-[343px] h-[590px] mo:h-[194px] rounded-xl"
  >
    {#if !isVideoPlaying}
      <img
        src="https://img.youtube.com/vi/tktyAa_bWiY/maxresdefault.jpg"
        alt="Video Thumbnail"
        class="w-full h-full object-cover cursor-pointer rounded-xl"
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
        src="https://www.youtube.com/embed/tktyAa_bWiY?autoplay=1&mute=1"
        title="YouTube video player"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    {/if}
  </div>
</div>
