<script lang="ts">
  import { ClipperPersistence } from "$lib/client/extensions/clipper/clipper.persistence";
  import {
    extractVideoId,
    isYoutubeVideoUrl
  } from "$lib/client/extensions/clipper/utils";
  import {
    ClipperExtensionEvent,
    type Clip
  } from "$lib/client/products/memotron/common/clip.type";
  import EmptyStatusInbox from "$lib/client/illustrations/EmptyStatusInbox.svelte";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { sendMessageToContentScript } from "$lib/client/utils/extension.utils";
  import TextClip from "./TextClip.svelte";
  import VideoTimestampClip from "./VideoTimestampClip.svelte";
  // import "~style.css";
  let timestampData = [];
  let textData = [];
  let clips: Clip[] = [];
  refreshTabdatav2();
  /**
   * @deprecated - use refreshTabdatav2 instead
   */
  function refreshTabData() {
    chrome.runtime.sendMessage({ query: "getCurrentTabUrl" }, (response) => {
      if (response) {
        const currentTabUrl = response.url;
        new ClipperPersistence()
          .fetchPageHighlights(currentTabUrl)
          .then((textHighlights) => {
            if (textHighlights != null) {
              textData = [...textHighlights];
            } else {
              textData = [];
            }
          })
          .catch((error) => {
            console.error("textHighlights not fetched:", error);
          });
        if (isYoutubeVideoUrl(currentTabUrl)) {
          const videoId = extractVideoId(currentTabUrl);
          console.log(videoId);
          new ClipperPersistence()
            .fetchYoutubeClips(videoId)
            .then((timestamps) => {
              if (timestamps != null) {
                timestampData = [...timestamps].sort(
                  (a, b) => a.timestamp - b.timestamp
                );
              } else {
                timestampData = [];
              }
            })
            .catch((error) => {
              console.error("timestamp not fetched:", error);
            });
        } else {
          timestampData = [];
        }
      }
    });
  }

  /**
   * Refreshes the clips data for the current tab
   *
   * A timeout is added to fetch the order of the text highlights from the content script as the content script needs to resolve the highlights first and render them.
   * @param url
   */
  async function refreshTabdatav2(url: string | undefined = undefined) {
    if (!url) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        refreshTabdatav2(tabs[0].url);
      });
      return;
    }
    let textClips = [];
    let videoTimestampClips = [];
    const result = await new ClipperPersistence().fetchPage(url);
    // console.log("refreshTabdatav2", { url, result });
    if (result?.page?.clips && result.page.clips.length > 0) {
      const rawClips: Clip[] = result.page.clips;
      textClips = rawClips.filter(
        (clip) => clip.contentType === NodeType.TEXT_CLIP
      );
      videoTimestampClips = rawClips
        .filter((clip) => clip.contentType === NodeType.VIDEO_TIMESTAMP_CLIP)
        ?.sort((a, b) => a.body.timestamp - b.body.timestamp);
      setTimeout(async () => {
        await resolveOrderAndRenderClips();
      }, 1000);
    } else {
      clips = [];
    }
    async function resolveOrderAndRenderClips() {
      const order = await sendMessageToContentScript({
        event: ClipperExtensionEvent.RESOLVE_TEXT_HIGHLIGHTS_ORDER
      });
      if (order) {
        textClips = order.map((x) =>
          textClips.find((clip) => clip.id === x.id)
        );
      }
      clips = [...videoTimestampClips, ...textClips];
    }
  }

  chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
      if (
        message.event == ExtensionEvent.TAB_CHANGE ||
        message.event == ExtensionEvent.TAB_UPDATE ||
        message.event == ClipperExtensionEvent.CLIPS_CHANGED
      ) {
        refreshTabdatav2(message.tab?.url);
      }
    }
  );

  function onThumbnailClick(clipId) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        event: ExtensionEvent.CLICK_SIDEBAR,
        clip: clips.find((clip) => clip.id === clipId)
      });
    });
  }

  function handleKeyPress(event, url) {
    if (event.key === "Enter" || event.key === " ") {
      // handleVideoClick(url);
      event.preventDefault();
    }
  }
</script>

<main class="p-4 grow">
  {#if clips?.length > 0}
    <div class="flex flex-col grow w-full gap-6 overflow-auto">
      {#each clips as clip, index (clip.id)}
        {#if clip.contentType === NodeType.TEXT_CLIP}
          <TextClip
            {clip}
            on:click={() => onThumbnailClick(clip.id)}
            on:keydown
          />
        {:else if clip.contentType === NodeType.VIDEO_TIMESTAMP_CLIP && "timestamp" in clip.body}
          <VideoTimestampClip
            {clip}
            on:click={() => onThumbnailClick(clip.id)}
            on:keydown
          />
        {/if}
      {/each}
    </div>
  {:else}
    <div class="w-full h-full flex flex-col gap-2 items-center justify-center">
      <!-- TODO - use EmptyStatusView after lib refactoring for clipper -->
      <EmptyStatusInbox width={40} />
      <div class="flex flex-col items-center gap-1">
        <div class="font-medium text-b2">No clips found.</div>
        <div class="text-b3 text-fgs2">Start highlighting to create clips.</div>
      </div>
    </div>
  {/if}
</main>
