<script lang="ts">
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import {
    NodeType,
    type IClip
  } from "$lib/client/products/memotron/node/node.type";
  import { relayToContentScript } from "$lib/client/utils/extension.utils";
  import TextClip from "./TextClip.svelte";
  import VideoTimestampClip from "./VideoTimestampClip.svelte";
  import { wait } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";

  export let clips: IClip[] = [];
  let transformedClips: IClip[] = [];
  let isLoadingState: boolean = true;

  onMount(async () => {
    transformedClips = await refresh(clips);
    isLoadingState = false;
  });

  /**
   * Refreshes the clips data for the current tab
   *
   * A timeout is added to fetch the order of the text highlights from the content script as the content script needs to resolve the highlights first and render them.
   * @param url
   */
  async function refresh(clip: IClip[]) {
    let textClips = [];
    let videoTimestampClips = [];
    if (clip && clip.length > 0) {
      const rawClips: IClip[] = clip;
      textClips = rawClips.filter(
        (clip) => clip.contentType === NodeType.TEXT_CLIP
      );
      videoTimestampClips = rawClips
        .filter((clip) => clip.contentType === NodeType.VIDEO_TIMESTAMP_CLIP)
        ?.sort((a, b) => a.body.timestamp - b.body.timestamp);
      await wait(1000);
      return resolveOrderAndRenderClips();
    }
    return [];

    async function resolveOrderAndRenderClips() {
      const order = await relayToContentScript({
        event: ClipperExtensionEvent.RESOLVE_TEXT_HIGHLIGHTS_ORDER
      });
      if (order) {
        textClips = order.map((x) =>
          textClips.find((clip) => clip.id === x.id)
        );
      }
      return [...videoTimestampClips, ...textClips];
    }
  }

  function onThumbnailClick(clipId) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        event: ExtensionEvent.CLICK_FROM_SIDEPANEL,
        clip: transformedClips.find((clip) => clip.id === clipId)
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

<main class="grow">
  {#if transformedClips?.length > 0}
    <div class="flex flex-col grow w-full gap-3 overflow-auto">
      {#each transformedClips as clip, index (clip.id)}
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
      <ScrollViewBottomSpacer />
    </div>
  {:else}
    <EmptyStatusView
      {isLoadingState}
      isSearchContext={true}
      mainText="No clips found."
      subText="Start highlighting to create clips."
    />
  {/if}
</main>
