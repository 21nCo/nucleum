<script lang="ts">
  import ToolbarOpener from "$lib/client/extensions/clipper/toolbar/ToolbarOpener.svelte";
  import {
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
  import { webpage, toolbarState, feedbackPane, syncStore } from "./store";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import ExtensionBaseLayer from "$lib/client/extensions/ExtensionBaseLayer.svelte";
  import { linker } from "$lib/client/products/memotron/linking/link.store";
  import ScreenShot from "./ScreenShot.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { enumToString } from "$lib/shared/utils/text.utils";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { highlightStore } from "$lib/client/products/memotron/common/highlighters/highlight.store";
  import { AlertType } from "$lib/client/types/notification.type";
  import SyncPane from "../syncPane/SyncPane.svelte";
  import LoginNotification from "../feedbackPane/LoginNotification.svelte";
  import { relayToBackgroundScript } from "$lib/client/utils/extension.utils";
  import { fileStore } from "$lib/client/components/files/file.store";
  import { propertyStore } from "$lib/client/products/memotron/collection/properties/property.store";
  export let id: string;
  let textClipperRef: any;
  let isSnipActive: boolean = false;
  let loginNotification: string | null = null;
  $: contentType = resolveContentTypeForUrl($webpage.url);
  function onActivateColor(e) {
    textClipperRef.onActivateColor(e);
  }
  async function onSaveClick() {
    const contentTypeStr = enumToString(contentType);
    $feedbackPane.feedback = `Saving ${contentTypeStr}...`;
    $feedbackPane.isShown = true;
    if (contentType === NodeType.TWEET) {
      const tweetNode = extractTweetFromTweeetPage();
      if (!tweetNode) return;
      await webpage.saveTweet(tweetNode, true);
    } else if (contentType === NodeType.TWITTER_PROFILE) {
      const data = extractTwitterProfile();
      if (!data) return;
      await webpage.saveTwitterProfile(data);
    } else {
      await webpage.savePage();
    }
    $feedbackPane.feedback = {
      message: `${contentTypeStr} saved!`,
      type: AlertType.SUCCESS
    };
  }

  async function onClipMutationFromSidePanel(data: any) {
    let result;
    if (data.action === "link") {
      result = await webpage.linkClip(data.clipId, data.linkTo);
    } else if (data.action === "unlink") {
      result = await webpage.removeLinkForClip(data.clipId, data.linkTo);
    } else if (data.action === "notes") {
      //TODO - result
      await webpage.persistClipNotes(data.clipId, data.notes);
      result = { id: data.clipId, type: AlertType.SUCCESS };
    }
    if (result?.type === AlertType.SUCCESS)
      return $webpage.clips?.find((clip) => clip.id === data.clipId);
    else return result;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.log({
      at: "onMessage - Content script",
      event: message.event,
      message
    });

    const handleMessage = async () => {
      try {
        switch (message.event) {
          case ExtensionEvent.TAB_CHANGE:
          case ExtensionEvent.TAB_UPDATE:
            webpage.onContextChange(message.tab);
            return;

          case ExtensionEvent.LOGOUT:
            loginNotification = "Logged out. Please login again to continue";
            webpage.reset();
            return;

          case ExtensionEvent.PAGE_STATE:
            return $webpage;

          case ClipperExtensionEvent.SAVE_WEBPAGE:
            await onSaveClick();
            return { success: true };

          case ClipperExtensionEvent.CLIP_MUTATION:
            const result = await onClipMutationFromSidePanel(message.data);
            return result;

          case ClipperExtensionEvent.PAGE_SAVING_STATUS:
            if (message.node) {
              webpage.propagatePageStatusFromSidebar({ id: message.node });
              return { success: true };
            }
            return { success: false, error: "No node provided" };

          default:
            return { success: false, error: "Unknown event" };
        }
      } catch (error) {
        console.error("Error handling message:", error);
        return { success: false, error: error.message };
      }
    };

    // This keeps the message channel open for asynchronous processing
    handleMessage().then(sendResponse);
    return true; // Indicates that the response will be sent asynchronously
  });
</script>

<ExtensionBaseLayer
  {id}
  stores={[
    nodeStore,
    collectionStore,
    toolbarState,
    webpage,
    linker,
    highlightStore,
    fileStore,
    propertyStore
  ]}
  on:login={(e) => (loginNotification = e.detail.message)}
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
    <!-- <div out:fade={{ duration: 150 }}> -->
    {#if loginNotification}
      <LoginNotification
        message={loginNotification}
        on:click={() => {
          relayToBackgroundScript({
            event: ExtensionEvent.LOGIN
          });
          loginNotification = null;
        }}
      />
    {:else if $feedbackPane.isShown}
      <FeedbackPane />
    {:else if $syncStore.isShowSyncPane}
      <SyncPane />
    {/if}
    <!-- </div> -->
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
