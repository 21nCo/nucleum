<script lang="ts">
  import { logger } from "$lib/client/components/debug/logger.client";
  import { onMount } from "svelte";

  // Extend Window interface to include YouTube specific properties
  declare global {
    interface Window {
      YT: any;
      onYouTubeIframeAPIReady: () => void;
      [key: string]: any; // Allow dynamic properties for instance-specific callbacks
    }
  }

  export let url: string;
  export let timestamp: number | null = null;
  let videoId: string | null = null;

  const instanceId = Math.random().toString(36).substring(2, 15);
  let player: any;
  let playerReady = false;
  let errorMessage = "";
  $: console.log({ url, videoId });

  onMount(() => {
    if (url) {
      videoId = extractVideoId(url);
    }
    if (!videoId) return;

    // Create a unique callback name for this instance
    const callbackName = `onYouTubeIframeAPIReady_${instanceId}`;

    const win = window as any;
    if (win.YT && win.YT.Player) {
      initializePlayer();
    } else {
      // Only load the API script if it hasn't been loaded yet
      if (
        !document.querySelector(
          'script[src="https://www.youtube.com/iframe_api"]'
        )
      ) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Set up unique callback for this instance
      win[callbackName] = initializePlayer;
      if (!win.onYouTubeIframeAPIReady) {
        win.onYouTubeIframeAPIReady = () => {
          // Call all instance-specific callbacks
          Object.keys(win).forEach((key) => {
            if (key.startsWith("onYouTubeIframeAPIReady_")) {
              win[key]();
            }
          });
        };
      }
    }

    return () => {
      if (player && typeof player.destroy === "function") {
        player.destroy();
      }
      delete win[callbackName];
    };
  });

  function extractVideoId(url: string): string | null {
    let videoId = null;
    const youtubeRegex =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(youtubeRegex);

    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      const shortsMatch = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
      if (shortsMatch) {
        videoId = shortsMatch[1];
      }
    }

    return videoId;
  }

  function initializePlayer() {
    try {
      const containerId = `player-container-${instanceId}`;
      player = new window.YT.Player(containerId, {
        height: "600",
        width: "100%",
        videoId: videoId,
        playerVars: {
          autoplay: 0
        },
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
      player.seekTo(timestamp, true);
      player.playVideo();
    }
  }

  function onPlayerReady() {
    playerReady = true;
    errorMessage = "";
    if (timestamp) {
      player.seekTo(timestamp, true);
    }
    cueVideo();
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

  function cueVideo() {
    if (playerReady && videoId) {
      errorMessage = "";
      // player.loadVideoById(videoId, timestamp);
      player.cueVideoById(videoId, timestamp);
    }
  }
</script>

<div class="flex flex-col w-full h-full justify-center items-center">
  <div id={`player-container-${instanceId}`} class="w-full">
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
