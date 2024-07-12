<script lang="ts">
  import { onMount } from "svelte";
  import { ClipperPersistence } from "$lib/client/extensions/clipper/clipper.persistence";
  import {
    createClipButton,
    createClipPointer
  } from "$lib/client/extensions/clipper/utils";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { NodeType } from "$lib/client/types/memotron/node.type";
  import { ClipperExtensionEvent } from "$lib/client/types/memotron/clip.type";

  async function refreshVideoTimestamps(url: string) {
    const result = await new ClipperPersistence().fetchPage(url);
    if (result?.page?.clips && result.page.clips.length > 0) {
      const timestamps = result.page.clips.filter(
        (clip) => clip.contentType === NodeType.VIDEO_TIMESTAMP_CLIP
      );
      for (let i = 0; i < timestamps.length; i++) {
        placePointerOnPlayer(timestamps[i].body.timestamp);
      }
    }
  }

  function clip() {
    if (
      window.location.hostname === "www.youtube.com" &&
      window.location.pathname === "/watch"
    ) {
      const videoId = new URLSearchParams(window.location.search).get("v");
      const videoPlayer = document.querySelector("video");
      if (videoPlayer && !isNaN(videoPlayer.currentTime)) {
        const timestamp = Math.floor(videoPlayer.currentTime);
        placePointerOnPlayer(timestamp);
        captureVideoFrame(videoPlayer);
        const videoUrlWithTimestamp = `https://www.youtube.com/watch?v=${videoId}&t=${timestamp}s`;
        return { videoUrlWithTimestamp, timestamp };
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
  }

  /**
   * TODO - Clip button UI - svelte
   */
  function initializeClipButton() {
    const control = "ytp-time-display.notranslate";
    const progressbar = "ytp-progress-bar-padding";
    const controlElement = document.querySelector(`.${control}`);
    const progressBarElements = document.querySelectorAll(`.${progressbar}`);
    if (controlElement && controlElement instanceof HTMLElement) {
      const clipButton = createClipButton(controlElement);
      clipButton.addEventListener("click", function () {
        const { videoUrlWithTimestamp, timestamp } = clip();
        new ClipperPersistence().saveClip({
          contentType: NodeType.VIDEO_TIMESTAMP_CLIP,
          body: {
            timestamp,
            url: videoUrlWithTimestamp
          },
          metadata: {}
        });
        // chrome.runtime.sendMessage({
        //   action: "saveYoutubeClip",
        //   videoUrlWithTimestamp: videoUrlWithTimestamp,
        //   videoId: videoId,
        //   timestamp: timestamp
        // });

        chrome.runtime.sendMessage({
          event: ClipperExtensionEvent.CLIPS_CHANGED
        });
      });

      if (controlElement.nextSibling) {
        controlElement.parentNode.insertBefore(
          clipButton,
          controlElement.nextSibling
        );
      } else {
        controlElement.parentNode.appendChild(clipButton);
      }
    } else {
      console.log(`Element with class ${control} not found.`);
    }

    if (progressBarElements) {
      const newProgressBar = document.createElement("div");
      newProgressBar.className = "mem-progress-bar";
      newProgressBar.style.height = "30px";

      progressBarElements.forEach(function (progressBar) {
        var cloneNewProgressBar = newProgressBar.cloneNode(true);
        if (progressBar instanceof HTMLElement) {
          progressBar.style.height = "63px";
        }
        progressBar.appendChild(cloneNewProgressBar);
      });
    } else {
      console.log(`Element with class ${progressBarElements} not found.`);
    }
  }

  /**
   * TODO - clip pointer
   */
  function placePointerOnPlayer(timestamp) {
    const playerControls = document.querySelector(".ytp-chrome-bottom");
    if (playerControls && playerControls instanceof HTMLElement) {
      const pointer = createClipPointer();
      const duration = document.querySelector("video").duration;
      const position = (timestamp / duration) * playerControls.offsetWidth;
      pointer.style.left = `${position - 5}px`;
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

  function captureVideoFrame(video) {
    var canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    var imageURL = canvas.toDataURL("image/png");
    localStorage.setItem("capturedYoutubeFrame", imageURL);
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.event === ExtensionEvent.TAB_UPDATE) {
      removeAllPointers();
      refreshVideoTimestamps(message.tab.url);
    } else if (message.event === ExtensionEvent.CLICK_SIDEBAR && message.clip) {
      const player = document.querySelector("video");
      if (player && message.clip?.body?.timestamp) {
        console.log("Seeking to timestamp: ", message.clip.body.timestamp);
        player.currentTime = message.clip.body.timestamp;
      }
    }
  });

  onMount(() => {
    initializeClipButton();
  });
</script>

<!-- <div>youtube content</div> -->
