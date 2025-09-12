<script lang="ts">
  import view from "$lib/client/stores/view.store";
  import { cn } from "$lib/client/utils/ui.utils";
  import type { IFeature } from "../landing.type";
  import VisualRender from "../VisualRender.svelte";
  export let feature: IFeature;
  export let isReversed: boolean = false;

  function extractVideoId(url: string): string | null {
    const youtubeRegex =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(youtubeRegex);
    return match && match[2].length === 11 ? match[2] : null;
  }

  function getYoutubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }

  $: videoId = feature.videoElement?.url
    ? extractVideoId(feature.videoElement.url)
    : null;
  $: thumbnailUrl = videoId ? getYoutubeThumbnail(videoId) : null;
</script>

<div
  class={cn("flex mo:flex-col gap-32 h-[36rem] mo:h-auto w-full", {
    "flex-row-reverse": isReversed
  })}
>
  {#if !$view.isConstrainedWidth}
    <div
      class="h-full w-2/3 min-w-[20rem] dp:min-w-[30rem] mo:w-full bg-bgs1 rounded-t-xl flex justify-center overflow-clip relative"
    >
      <img
        src={feature.image}
        alt={feature.title}
        class="absolute top-12 inset-x-0 object-contain px-12"
      />
    </div>
  {/if}
  <div class="flex flex-col gap-4">
    <div
      class={cn("text-lb2 text-left", {
        "text-aps1": isReversed,
        "text-ags1": !isReversed
      })}
    >
      {feature.feature}
    </div>
    <div class="flex flex-col gap-5">
      <h3 class="text-[36px] mo:text-h2 font-medium text-left">
        {feature.title}
      </h3>
      <p class="text-lbase text-fgs2 text-left">{feature.desc}</p>
      <div class="flex justify-center items-center">
        <VisualRender name={feature.visualRenderComponent} />
      </div>
    </div>
    {#if feature.videoElement}
      <a
        class="group flex items-center gap-3 mt-4 border border-brs3 rounded-md py-2 px-4 w-fit hover:bg-bgs1"
        href={feature.videoElement?.url}
        target={feature.videoElement?.url?.startsWith("http")
          ? "_blank"
          : "_self"}
        rel={feature.videoElement?.url?.startsWith("http")
          ? "noopener noreferrer"
          : undefined}
        title={feature.videoElement?.url ? "Click to watch video" : ""}
      >
        <div class="w-20 h-11 bg-bgs3 rounded-md overflow-hidden">
          {#if videoId && thumbnailUrl}
            <img
              src={thumbnailUrl}
              alt="{feature.videoElement?.title ?? feature.feature} thumbnail"
              class="w-full h-full object-cover"
            />
          {/if}
        </div>
        <div class="flex flex-col gap-1">
          <div class="text-lb2 text-left font-medium">
            {feature.videoElement.title ?? feature.feature}
          </div>
          <div class="flex items-center gap-1 text-b3 text-fgs3 text-left">
            Watch video
          </div>
        </div>
      </a>
    {/if}
  </div>
</div>
