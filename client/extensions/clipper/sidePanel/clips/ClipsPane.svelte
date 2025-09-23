<script lang="ts">
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import {
    NodeType,
    type IClip,
    type ITextClip,
    type IVideoTimestampClip
  } from "$lib/client/products/memotron/node/node.type";
  import { relayToContentScript } from "$lib/client/utils/extension.utils";
  import Clip from "./Clip.svelte";
  import { wait } from "$lib/client/utils/time.utils";
  import { onMount } from "svelte";
  import EmptyStatusView from "$lib/client/elements/feedback/EmptyStatusView.svelte";
  import ScrollViewBottomSpacer from "$lib/client/layout/scrollView/ScrollViewBottomSpacer.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import type { IRecordId } from "$lib/client/types/data.type";
  import { isSameResource } from "$lib/client/components/flux/resourceStores/resource.utils";

  export let clips: IClip[] = [];
  export let isMemotronPage: boolean = false;
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
  async function refresh(rawClips: IClip[]) {
    if (!rawClips || rawClips.length === 0) return [];
    logger.log({ at: "refresh - ClipsPane", rawClips });
    let textClips: ITextClip[] = [];
    let videoTimestampClips: IVideoTimestampClip[] = [];
    textClips = rawClips.filter(
      (clip) => clip.contentType === NodeType.WEB_TEXT_BOOKMARK
    );
    videoTimestampClips = rawClips
      .filter((clip) => clip.contentType === NodeType.YOUTUBE_BOOKMARK)
      ?.sort((a, b) => a.body.timestamp - b.body.timestamp);
    let webScreenshotClips = rawClips.filter(
      (clip) => clip.contentType === NodeType.WEB_SCREENSHOT
    );
    await wait(1000);
    return resolveOrderAndRenderClips();

    async function resolveOrderAndRenderClips() {
      const order = await relayToContentScript({
        event: ClipperExtensionEvent.RESOLVE_TEXT_HIGHLIGHTS_ORDER
      });
      logger.debug({ at: "resolveOrderAndRenderClips", order });
      if (textClips.length > 0 && Array.isArray(order) && order.length > 0) {
        textClips = order
          .map((x) => textClips.find((clip) => clip.id === x.id))
          .filter((x): x is ITextClip => x !== undefined);
      }
      return [...videoTimestampClips, ...textClips, ...webScreenshotClips];
    }
  }

  function onThumbnailClick(clipId: IRecordId) {
    // chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    //   chrome.tabs.sendMessage(tabs[0].id, {
    //     event: ExtensionEvent.CLICK_FROM_SIDEPANEL,
    //     clip: transformedClips.find((clip) => clip.id === clipId)
    //   });
    // });
    relayToContentScript({
      event: ExtensionEvent.CLICK_FROM_SIDEPANEL,
      data: {
        clip: transformedClips.find((clip) => clip.id === clipId)
      }
    });
  }

  function handleKeyPress(event, url) {
    if (event.key === "Enter" || event.key === " ") {
      // handleVideoClick(url);
      event.preventDefault();
    }
  }

  function onClipDelete(clipId: IRecordId) {
    transformedClips = transformedClips.filter(
      (clip) => !isSameResource(clip, clipId)
    );
  }
</script>

<main class="w-full h-full">
  {#if transformedClips?.length > 0}
    <div class="flex flex-col h-full w-full gap-3 overflow-y-auto">
      {#each transformedClips as clip, index (clip.id)}
        <!-- {#if clip.contentType === NodeType.WEB_TEXT_BOOKMARK || clip.contentType === NodeType.WEB_SCREENSHOT}
          <TextClip
            {clip}
            on:click={() => onThumbnailClick(clip.id)}
            on:keydown
          />
        {:else if clip.contentType === NodeType.YOUTUBE_BOOKMARK && "timestamp" in clip.body} -->
        <Clip
          {clip}
          on:click={() => onThumbnailClick(clip.id)}
          on:keydown
          on:delete={() => onClipDelete(clip.id)}
        />
        <!-- {/if} -->
      {/each}
      <ScrollViewBottomSpacer />
    </div>
  {:else}
    <EmptyStatusView
      {isLoadingState}
      isSearchContext={true}
      mainText={isMemotronPage
        ? "Hello from the other side of Memotron👋."
        : "No clips found."}
      subText={isMemotronPage
        ? "Start highlighting to save clips about Memotron to your Memotron."
        : "Start highlighting to create clips."}
    />
  {/if}
</main>
