<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import { onMount } from "svelte";
  export let url: string;
  export let timestamp: number | null = null;
  let videoId: string | null = null;

  let player: any;
  let playerReady = false;
  let errorMessage = "";
  $: console.log({ url, videoId });
  onMount(() => {
    // if (url) videoId = new URL(url).searchParams.get("v") || "";
    if (url) {
      videoId = extractVideoId(url);
    }
    if (!videoId) return;
    if (window.YT && window.YT.Player) {
      initializePlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    }

    return () => {
      if (player && typeof player.destroy === "function") {
        player.destroy();
      }
    };
  });

  function extractVideoId(url: string): string | null {
    let videoId = null;
    const youtubeRegex =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(youtubeRegex);

    if (match && match[2].length === 11) {
      videoId = match[2];
    }

    return videoId;
  }

  function initializePlayer() {
    try {
      player = new window.YT.Player("player-container", {
        height: "600",
        width: "100%",
        videoId: videoId,
        events: {
          onReady: onPlayerReady,
          onError: onPlayerError
        }
      });
    } catch (e) {
      logger.error({ at: "YoutubeVideoPreview initializePlayer", error: e });
    }
  }

  export function onTrace(e: any) {
    if (e.id && e.timestamp) {
      timestamp = e.timestamp;
    }
  }

  function onPlayerReady() {
    playerReady = true;
    errorMessage = "";
    if (timestamp) {
      player.seekTo(timestamp, true);
    }
  }

  function onPlayerError(event: any) {
    console.error("YouTube Player Error:", event.data);
    errorMessage = getErrorMessage(event.data);
  }

  function getErrorMessage(errorCode: number): string {
    switch (errorCode) {
      case 2:
        return "The video ID is invalid.";
      case 5:
        return "The requested content cannot be played in an HTML5 player.";
      case 100:
        return "The video requested was not found.";
      case 101:
      case 150:
        return "The owner of the requested video does not allow it to be played in embedded players.";
      default:
        return "An error occurred. Please try again later.";
    }
  }

  $: if (playerReady && timestamp) {
    player.seekTo(timestamp, true);
  }

  $: if (playerReady && videoId) {
    errorMessage = "";
    player.loadVideoById(videoId, timestamp);
  }
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
  <div id="player-container" class="w-full">
    {#if errorMessage}
      <div
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong class="font-bold">Error:</strong>
        <span class="block sm:inline">{errorMessage}</span>
      </div>
    {/if}
  </div>
</div>
<!-- {#if videoId}
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
{/if} -->
