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
  import {
    linker,
    linkTagStore
  } from "$lib/client/products/memotron/linking/link.store";
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
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  export let id: string;
  let textClipperRef: any;
  let extensionBaseRef: ExtensionBaseLayer;
  let isSnipActive: boolean = false;
  let loginNotification: number | null = null;
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

  async function onMutationRelayFromSidePanel(data: any) {
    logger.debug({ at: "onMutationRelayFromSidePanel", data });
    let result;
    if (data.action === "link") {
      result = await webpage.linkClip(data.clipId, data.linkTo);
    } else if (data.action === "unlink") {
      result = await webpage.removeLinkForClip(data.clipId, data.linkTo);
    } else if (data.action === "notes") {
      //TODO - result
      await webpage.persistClipNotes(data.clipId, data.notes);
      result = { id: data.clipId, type: AlertType.SUCCESS };
    } else if (data.action === "webpageNotes") {
      $webpage.notes = data.notes;
      result = { type: AlertType.SUCCESS };
    } else if (data.action === "delete") {
      await webpage.removeClip(data.clipId);
      result = { type: AlertType.SUCCESS };
    } else if (data.action === "property") {
      await webpage.updateClipProperty(data.clipId, data.property);
      result = { type: AlertType.SUCCESS };
    }
    if (result?.type === AlertType.SUCCESS && data.clipId)
      return $webpage.clips?.find(resourceInList(data.clipId));
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
          case ExtensionEvent.TAB_UPDATE:
            webpage.onContextChange(message.tab);
            return { status: "success", message: "context changed" };

          case ExtensionEvent.LOGOUT:
            loginNotification = -2;
            webpage.reset();
            return { status: "success", message: "Logged out" };

          case ExtensionEvent.PAGE_STATE:
            await webpage.refresh();
            return $webpage;

          case ClipperExtensionEvent.SAVE_WEBPAGE:
            await onSaveClick();
            return { status: "success", message: "Page saved" };

          case ClipperExtensionEvent.MUTATION_RELAY:
            const result = await onMutationRelayFromSidePanel(message.data);
            return { status: "success", message: "Clip mutation", result };
          case ExtensionEvent.MUTATION:
            await extensionBaseRef.loadInMemoryStore(message.data?.resource);
            return { status: "success", message: "In memory store reloaded" };
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    };
    handleMessage().then(sendResponse);
    return true;
  });
</script>

<ExtensionBaseLayer
  bind:this={extensionBaseRef}
  {id}
  stores={[
    nodeStore,
    collectionStore,
    propertyStore,
    linkTagStore,
    toolbarState,
    webpage,
    linker,
    highlightStore,
    fileStore
  ]}
  on:login={(e) => (loginNotification = e.detail.code)}
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
    {#if loginNotification !== null}
      <LoginNotification
        bind:code={loginNotification}
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
