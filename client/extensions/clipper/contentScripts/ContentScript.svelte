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
  import { collectionStore } from "$lib/client/components/collection/collection.store";
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
  import { propertyStore } from "$lib/client/components/collection/properties/property.store";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceError } from "$lib/client/components/error/errors";
  import { deepCopy } from "$lib/shared/utils/obj.utils";

  export let id: string;
  let textClipperRef: any;
  let extensionBaseRef: ExtensionBaseLayer;
  let isSnipActive: boolean = false;
  let loginNotification: number | null = null;
  let isDisableClipper = true;
  let isLoggedIn: boolean = false;
  const unavailableUrlsList = [
    /^https:\/\/(?:.*\.)?memotron\.io(?:\/.*)?$/,
    /^https:\/\/memotron\.tidigit\.dev(?:\/.*)?$/,
    /^https:\/\/(?:.*\.)?pointron\.io(?:\/.*)?$/,
    /^https:\/\/pointron\.tidigit\.dev(?:\/.*)?$/,
    /^https?:\/\/localhost(?::[0-9]+)?(?:\/.*)?$/,
    /^https:\/\/accounts\.google\.com(?:\/.*)?$/,
    /^https:\/\/appleid\.apple\.com(?:\/.*)?$/
  ];

  $: isDisableClipper = unavailableUrlsList.some((regex) => {
    return regex.test(window.location.href);
  });

  $: contentType = resolveContentTypeForUrl($webpage.url);
  function onActivateColor(e) {
    textClipperRef.onActivateColor(e);
  }

  async function onSaveClick() {
    try {
      const contentTypeStr = enumToString(contentType);
      feedbackPane.onPageSaveStart(`Saving ${contentTypeStr}...`);
      let result;
      if (contentType === NodeType.TWEET) {
        const tweetNode = extractTweetFromTweeetPage();
        if (!tweetNode) return;
        result = await webpage.saveTweet(tweetNode, true);
      } else if (contentType === NodeType.TWITTER_PROFILE) {
        const data = extractTwitterProfile();
        if (!data) return;
        result = await webpage.saveTwitterProfile(data);
      } else {
        result = await webpage.savePage();
      }
      if (!result || result.error) {
        feedbackPane.setErrorFeedback({
          isPreventAutoClose: false
        });
        return;
      }
      feedbackPane.onPageSaveSuccess(`${contentTypeStr} saved!`);
    } catch (error) {
      feedbackPane.setErrorFeedback({
        isPreventAutoClose: false
      });
    }
  }

  async function onMutationRelayFromSidePanel(data: any) {
    try {
      logger.debug({ at: "onMutationRelayFromSidePanel", data });
      let result;
      if (data.action === "link") {
        result = await webpage.linkClip(data.clipId, data.linkTo);
      } else if (data.action === "unlink") {
        result = await webpage.removeLinkForClip(data.clipId, data.linkTo);
      } else if (data.action === "notes") {
        result = await webpage.persistClipNotes(data.clipId, data.notes);
      } else if (data.action === "webpageNotes") {
        result = await webpage.persistPageNotes(data.notes);
      } else if (data.action === "delete") {
        result = await webpage.removeClip(data.clipId);
      } else if (data.action === "property") {
        result = await webpage.updateClipProperty(data.clipId, data.property);
      }
      if (data.clipId && result) {
        const clip = $webpage.clips?.find(resourceInList(data.clipId));
        return {
          ...result,
          clip
        };
      } else return result;
    } catch (error) {
      logger.error({ at: "onMutationRelayFromSidePanel", error });
      let errMessage = "Mutation failed";
      if (error instanceof ResourceError) {
        errMessage = error.message;
      }
      return {
        error: errMessage
      };
    }
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
            const token = await extensionBaseRef.onTabUpdate();
            if (token) isLoggedIn = true;
            if (!isLoggedIn) {
              loginNotification = -3;
              webpage.reset();
              return {
                status: "error",
                message: "You are not logged in"
              };
            } else {
              loginNotification = null;
            }
            webpage.onContextChange(message.tab);
            return { status: "success", message: "context changed" };

          case ExtensionEvent.LOGOUT:
            loginNotification = -2;
            isLoggedIn = false;
            webpage.reset();
            return { status: "success", message: "Logged out" };

          case ExtensionEvent.TOKEN_NOT_FOUND:
            loginNotification = -3;
            isLoggedIn = false;
            webpage.reset();
            return { status: "success", message: "Logged out" };

          case ExtensionEvent.PAGE_STATE:
            if (!isLoggedIn) {
              loginNotification = -3;
              return {
                status: "error",
                message: "You are not logged in"
              };
            }
            await webpage.refresh();
            return $webpage;

          case ClipperExtensionEvent.SAVE_WEBPAGE:
            if (!isLoggedIn) {
              loginNotification = -3;
              return {
                status: "error",
                message: "You are not logged in"
              };
            }
            await onSaveClick();
            return { status: "success", message: "Page saved" };

          case ClipperExtensionEvent.MUTATION_RELAY:
            const result = await onMutationRelayFromSidePanel(message.data);
            return result;
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
  bind:isLoggedIn
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
  {#if !isDisableClipper}
    {#if !$toolbarState?.isOpen}
      <ToolbarOpener on:click={() => toolbarState.toggle(true)} />
    {:else}
      {#if isLoggedIn}
        <Toolbar
          {contentType}
          bind:isSnipActive
          on:color={onActivateColor}
          on:save={onSaveClick}
          on:saved={() => {
            $feedbackPane.feedback = {
              message: "Page saved!",
              type: AlertType.SUCCESS
            };
            feedbackPane.toggle();
          }}
          on:summarize
          on:collapse={() => toolbarState.toggle(false)}
        />
      {/if}
      <!-- <div out:fade={{ duration: 150 }}> -->
      {#if loginNotification !== null}
        <LoginNotification
          isWithoutToolbarContext={!isLoggedIn}
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
      {#if isLoggedIn}
        <TextClipper bind:this={textClipperRef} />
      {/if}
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
  {/if}

  <ClipperShortcuts
    on:save={onSaveClick}
    on:collapse={() => {
      toolbarState.toggle();
    }}
  />
</ExtensionBaseLayer>
