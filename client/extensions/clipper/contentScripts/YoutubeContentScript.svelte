<script lang="ts">
  import { onMount } from "svelte";
  import { createClipPointer } from "$lib/client/extensions/clipper/clipper.utils";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import {
    NodeType,
    type IClipCapture
  } from "$lib/client/products/memotron/node/node.type";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { webpage } from "./store";
  import { appEvents } from "$lib/client/stores/notification.store";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { relayToBackgroundScript } from "$lib/client/utils/extension.utils";
  import Icon from "$lib/client/elements/Icon.svelte";

  let clipCount = 0;

  function refreshTimestamps() {
    removeAllPointers();
    clipCount = 0;
    const clips = $webpage.clips;
    logger.log({ at: "refreshTimestamps", clips });
    if (clips && clips.length > 0) {
      const timestamps = clips.filter(
        (clip) => clip.contentType === NodeType.YOUTUBE_TIMESTAMP_CLIP
      );
      clipCount = timestamps.length;
      for (let i = 0; i < timestamps.length; i++) {
        placePointerOnPlayer(timestamps[i].body.timestamp);
      }
    }
  }

  async function clip() {
    if (
      window.location.hostname === "www.youtube.com" &&
      window.location.pathname === "/watch"
    ) {
      const videoId = new URLSearchParams(window.location.search).get("v");
      const videoPlayer = document.querySelector("video");
      if (videoPlayer && !isNaN(videoPlayer.currentTime)) {
        const timestamp = Math.floor(videoPlayer.currentTime);
        placePointerOnPlayer(timestamp);
        const contentType = "image/png";
        const dataUrl = captureVideoFrame(videoPlayer);
        let s3Url;
        const response = await relayToBackgroundScript({
          event: ExtensionEvent.UPLOAD_FILE,
          data: { dataUrl, contentType }
        });
        const videoUrlWithTimestamp = `https://www.youtube.com/watch?v=${videoId}&t=${timestamp}s`;
        const fileId =
          response && typeof response === "object" && "id" in response
            ? response.id
            : "";
        return { videoUrlWithTimestamp, timestamp, fileId };
      } else {
        console.error(
          "YouTube video player not found or no video is currently playing."
        );
        return null;
      }
    } else {
      console.error("Not on a YouTube video page.");
      return null;
    }

    function captureVideoFrame(video) {
      var canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      var imageURL = canvas.toDataURL("image/png");
      return imageURL;
    }
  }

  /**
   * Places pointer at the timestamp location above the progress bar.
   */
  function placePointerOnPlayer(timestamp) {
    const playerControls = document.querySelector(".ytp-chrome-bottom");
    if (playerControls && playerControls instanceof HTMLElement) {
      const pointer = createClipPointer();
      const duration = document.querySelector("video").duration;
      const position = (timestamp / duration) * playerControls.offsetWidth;
      pointer.style.left = `${position - 5}px`;
      pointer.addEventListener("click", function () {
        const player = document.querySelector("video");
        console.log("Seeking to timestamp: ", {
          timestamp,
          player
        });
        if (player && timestamp) {
          player.currentTime = timestamp;
        }
      });
      playerControls.appendChild(pointer);
    }
  }

  function removeAllPointers() {
    const playerControls = document.querySelector(".ytp-chrome-bottom");
    if (playerControls && playerControls instanceof HTMLElement) {
      const existingPointers =
        playerControls.querySelectorAll(".my-custom-pointer");
      existingPointers.forEach((pointer) => pointer.remove());
    }
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log({
      at: "onMessage - Youtube content script",
      event: message.event
    });
    if (message.event === ExtensionEvent.CLICK_FROM_SIDEPANEL && message.clip) {
      const player = document.querySelector("video");
      if (player && message.clip?.body?.timestamp) {
        console.log("Seeking to timestamp: ", message.clip.body.timestamp);
        player.currentTime = message.clip.body.timestamp;
      }
    }
  });

  onMount(() => {
    clipCount = 0;
    const sub = appEvents.subscribe(async (x) => {
      if (x.event === ClipperExtensionEvent.REFRESH_CLIPS_RENDERING) {
        logger.log({
          at: "onMessage - Youtube content script",
          event: x.event
        });
        setTimeout(() => {
          refreshTimestamps();
        }, 1000);
      }
    });
    return () => {
      sub();
    };
  });

  async function onClick() {
    const clipDetails = await clip();
    if (!clipDetails) return;
    const clipItem: IClipCapture = {
      contentType: NodeType.YOUTUBE_TIMESTAMP_CLIP,
      url: clipDetails.videoUrlWithTimestamp,
      body: {
        timestamp: clipDetails.timestamp,
        thumbnail: clipDetails.fileId
      },
      metadata: {}
    };
    await webpage.saveClip(clipItem);
    clipCount++;
    //TODO - show feedback
    chrome.runtime.sendMessage({
      event: ClipperExtensionEvent.CLIPS_CHANGED,
      clips: $webpage.clips
    });
  }
  function resizeEventListener() {
    refreshTimestamps();
  }
</script>

<div class="flex w-full h-full justify-center items-center px-4 py-2">
  <button
    class="flex items-center justify-center rounded-md bg-bgs1 h-8"
    on:click={() => {
      relayToBackgroundScript({ event: ExtensionEvent.TOGGLE_SIDEPANEL });
      refreshTimestamps();
    }}
  >
    <span class="text-b2 shadow-none px-3">
      {clipCount} clips
    </span>
    <button
      on:click|stopPropagation={onClick}
      class="bg-aps3 hover:bg-aps2 border border-aps2 flex w-12 justify-center items-center h-full rounded-r-md"
    >
      <Icon icon="plus" />
    </button>
  </button>
</div>
<svelte:window on:resize={resizeEventListener} />
