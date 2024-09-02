<script lang="ts">
  import { onMount } from "svelte";
  import type { IVideoTimestampClip, IYoutubeVideo } from "../../node.type";
  export let node: IYoutubeVideo | IVideoTimestampClip;
  let videoId: string | null = null;
  onMount(async () => {
    console.log("YoutubeVideoPreview - mounted");
    videoId = new URL(node.body.url).searchParams.get("v");
    console.log({ videoId });
  });
</script>

{#if videoId}
  {@const timestamp =
    "timestamp" in node.body ? node.body.timestamp : undefined}
  <div class="flex flex-col w-full h-full justify-center items-center">
    <iframe
      src="https://www.youtube.com/embed/{videoId}{timestamp
        ? '?start=' + timestamp
        : ''}"
      title="YouTube video player"
      frameborder="0"
      height="600"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
      class="w-full"
    ></iframe>
  </div>
{/if}
