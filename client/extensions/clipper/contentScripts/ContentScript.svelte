<script lang="ts">
  import ToolbarOpener from "$lib/client/extensions/clipper/toolbar/ToolbarOpener.svelte";
  import {
    extractFullTabData,
    extractMinimalTabData,
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
  import { commonMetadata } from "$lib/client/products/memotron/common/urlMap";
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  export let id: string;
  let textClipperRef: any;
  let isSnipActive: boolean = false;
  $: contentType = resolveContentTypeForUrl($webpage.url);
  function onActivateColor(e) {
    textClipperRef.onActivateColor(e);
  }
  async function onSaveClick() {
    const contentTypeStr = enumToString(contentType);
    $feedbackPane.feedback = `Saving ${contentTypeStr}...`;
    $feedbackPane.isShown = true;
    if (contentType === NodeType.WEB_PAGE) {
      await saveGenericWebpage();
    } else if (contentType === NodeType.TWEET) {
      const tweetNode = extractTweetFromTweeetPage();
      if (!tweetNode) return;
      await webpage.saveTweet(tweetNode, true);
    } else if (contentType === NodeType.TWITTER_PROFILE) {
      const data = extractTwitterProfile();
      if (!data) return;
      await webpage.saveTwitterProfile(data);
    }
    $feedbackPane.feedback = `${contentTypeStr} saved!`;
  }

  function saveGenericWebpage() {
    return new Promise(async (resolve, reject) => {
      const host = window.location.host;
      console.log({ host });
      if (
        commonMetadata.some(
          (x) => host === x.domain || host.includes("." + x.domain)
        )
      ) {
        console.log("minimal metadata page");
        const tab = extractMinimalTabData();
        await webpage.savePage({ ...tab, contentType: NodeType.WEB_PAGE });
        resolve(true);
        return;
      }
      screenshotWebpage(async (s3Url) => {
        const tab = extractFullTabData();
        tab.metadata = { ...tab.metadata, screenshotUrl: s3Url };
        await webpage.savePage(tab);
        resolve(true);
      });
    });
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
  stores={[
    nodeStore,
    collectionStore,
    toolbarState,
    webpage,
    linker,
    highlightStore
  ]}
>
  {#if !$toolbarState?.isOpen}
    <ToolbarOpener on:click={() => toolbarState.toggle(true)} />
  {:else}
    <Toolbar
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
    <TextClipper bind:this={textClipperRef} />
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
