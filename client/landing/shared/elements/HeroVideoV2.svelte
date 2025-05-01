<script lang="ts">
  import SvgIcon from "$lib/client/elements/SVGIcon.svelte";
  import { cn } from "$lib/client/utils/ui.utils";
  export let url: string;
  export let deviceImages: string[];
  let isVideoPlaying = false;
  let laptopImageSrc = deviceImages.find((image) => image.includes("laptop"));
</script>

<div class="-mt-48 flex justify-center mo:min-h-40 min-h-[438px] w-full">
  {#if !isVideoPlaying}
    <!-- thumbnail -->
    <div class="relative overflow-clip rounded-xl min-h-fit w-[812px]">
      <img
        src="./Frame-10.png"
        alt="Thumbnail"
        class="absolute object-cover h-full w-full"
      />
      <div class="absolute inset-0 w-full h-full bg-fgs4 bg-opacity-20" />
      <div class="absolute inset-0 mo:w-32 w-[50%] mx-auto my-auto">
        <img
          src={laptopImageSrc}
          alt={laptopImageSrc}
          class="object-contain absolute inset-y-0 my-auto z-20 transition-all ease-out duration-500"
        />
        {#each deviceImages.filter((image) => !image.includes("laptop")) as image}
          <img
            src={image}
            alt={image}
            class={cn("object-contain transition-all ease-out duration-500", {
              "w-[25%] absolute inset-y-0 my-auto pt-12 mo:-right-5 -right-12 z-30":
                image.includes("phone"),
              "w-7/10 absolute inset-y-0 my-auto pt-6 mo:-left-10 -left-16 z-10":
                image.includes("tab")
            })}
          />
        {/each}
      </div>
      <button
        class="absolute inset-0 flex items-center justify-center z-40 text-fgs1 hover:scale-110 transition-all ease-out duration-200"
        on:click={() => (isVideoPlaying = true)}
      >
        <SvgIcon icon="play" isRenderRaw={true} />
      </button>
    </div>
  {:else}
    <iframe
      class="w-[812px] h-full rounded-xl"
      src={url + "&autoplay=1&enablejsapi=1"}
      title="YouTube video player"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  {/if}
</div>
