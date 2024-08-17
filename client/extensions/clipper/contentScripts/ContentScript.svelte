<script lang="ts">
  import ToolbarOpener from "$lib/client/extensions/clipper/toolbar/ToolbarOpener.svelte";
  import {
    extractFullTabData,
    extractTweetFromTweeetPage,
    extractTwitterProfile,
    resolveContentTypeForUrl
  } from "$lib/client/extensions/clipper/clipper.utils";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import FeedbackPane from "$lib/client/extensions/clipper/feedbackPane/FeedbackPane.svelte";
  import ClipperShortcuts from "$lib/client/extensions/clipper/ClipperShortcuts.svelte";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import { collectionStore } from "$lib/client/products/memotron/collection/collection.store";
  import Toolbar from "$lib/client/extensions/clipper/toolbar/Toolbar.svelte";
  import MultimediaClipper from "$lib/client/extensions/clipper/contentScripts/MultimediaClipper.svelte";
  import TextClipper from "$lib/client/extensions/clipper/contentScripts/TextClipper.svelte";
  import { webpage, toolbarState, feedbackPane } from "./store";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import ExtensionBaseLayer from "$lib/client/extensions/ExtensionBaseLayer.svelte";
  import { linker } from "$lib/client/products/memotron/memotron.store";
  import ScreenShot from "./ScreenShot.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import account from "$lib/client/stores/account.store";
  export let id: string;
  let colors = ["#be8686", "#f6e05e", "#88c0d0", "#a3be8c", "#d08770"];
  let textClipperRef: any;
  let isSnipActive: boolean = false;
  $: contentType = resolveContentTypeForUrl($webpage.url);
  function onActivateColor(e) {
    textClipperRef.onActivateColor(e);
  }
  async function onSaveClick() {
    let screenshotUrl: string | null = null;
    screenshotWebpage((s3Url) => {
      console.log({ s3Url });
      screenshotUrl = s3Url;
      proceedWithSave();
    });
    async function proceedWithSave() {
      const contentTypeStr = enumToString(contentType);
      $feedbackPane.feedback = `Saving ${contentTypeStr}...`;
      $feedbackPane.isShown = true;
      if (contentType === NodeType.WEB_PAGE) {
        let data = extractFullTabData();
        data.metadata = { ...data.metadata, screenshotUrl };
        await webpage.savePage(data);
      } else if (contentType === NodeType.TWEET) {
        const tweetNode = extractTweetFromTweeetPage();
        if (!tweetNode) return;
        tweetNode.metadata = { ...tweetNode.metadata, screenshotUrl };
        await webpage.saveTweet(tweetNode, true);
      } else if (contentType === NodeType.TWITTER_PROFILE) {
        const data = extractTwitterProfile();
        if (!data) return;
        data.metadata = { ...data.metadata, screenshotUrl };
        await webpage.saveTwitterProfile(data);
      }
      $feedbackPane.feedback = `${contentTypeStr} saved!`;
    }
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (
      message.event === ExtensionEvent.TAB_CHANGE ||
      message.event === ExtensionEvent.TAB_UPDATE
    ) {
      logger.log({
        at: "onMessage - tab change or update",
        event: message.event,
        message
      });
      webpage.onContextChange(message.tab);
      return;
    } else if (message.event === ExtensionEvent.READ_PAGE_CONTENT) {
      const data = extractFullTabData();
      sendResponse(data);
    } else if (
      message.event === ClipperExtensionEvent.PAGE_SAVING_STATUS &&
      message.node
    ) {
      webpage.propagatePageStatusFromSidebar({ id: message.node });
    }
  });

  function screenshotWebpage(callback: (data: string) => void) {
    chrome.runtime.sendMessage(
      {
        event: ClipperExtensionEvent.SCREENSHOT
      },
      (data) => {
        processScreenshot(data);
      }
    );

    async function processScreenshot(dataURL) {
      const contentType = "image/png";
      const s3SignedURL = await account.getSignedUrl(
        contentType,
        "screenshot.png",
        false
      );
      chrome.runtime.sendMessage(
        {
          event: ExtensionEvent.UPLOAD_TO_S3_USING_UPLOAD_URL,
          data: { s3SignedURL, dataURL, contentType }
        },
        (response) => {
          if (response == 200) {
            callback(s3SignedURL.uploadURL.split("?")[0]);
          }
        }
      );
    }
  }
</script>

<ExtensionBaseLayer
  {id}
  stores={[nodeStore, collectionStore, toolbarState, webpage, linker]}
>
  {#if !$toolbarState?.isOpen}
    <ToolbarOpener on:click={() => toolbarState.toggle(true)} />
  {:else}
    <Toolbar
      {colors}
      {contentType}
      bind:isSnipActive
      on:color={onActivateColor}
      on:save={onSaveClick}
      on:saved={() => {
        $feedbackPane.feedback = "Page saved!";
        feedbackPane.toggle();
      }}
      on:summarize
      on:collapse={() => toolbarState.toggle(false)}
    />
    {#if $feedbackPane.isShown}
      <!-- <div out:fade={{ duration: 150 }}> -->
      <FeedbackPane />
      <!-- </div> -->
    {/if}
    <TextClipper bind:this={textClipperRef} {colors} />
    <MultimediaClipper {colors} />
    {#if isSnipActive}
      <ScreenShot
        on:saved={() => {
          isSnipActive = false;
        }}
        on:close={() => {
          isSnipActive = false;
        }}
      />
    {/if}
  {/if}
  <ClipperShortcuts
    on:save={onSaveClick}
    on:collapse={() => {
      toolbarState.toggle();
    }}
  />
</ExtensionBaseLayer>
