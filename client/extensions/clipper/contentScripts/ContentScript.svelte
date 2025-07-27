<script lang="ts">
  import ToolbarOpener from "$lib/client/extensions/clipper/toolbar/ToolbarOpener.svelte";
  import {
    extractTweetFromTweeetPage,
    extractTwitterProfile,
    resolveContentTypeForUrl,
    resolveContentTypeString
  } from "$lib/client/extensions/clipper/clipper.utils";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import FeedbackPane from "$lib/client/extensions/clipper/feedbackPane/FeedbackPane.svelte";
  import Toolbar from "$lib/client/extensions/clipper/toolbar/Toolbar.svelte";
  import TextClipper from "$lib/client/extensions/clipper/contentScripts/TextClipper.svelte";
  import { webpage, toolbarState, feedbackPane, syncStore } from "./store";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import ExtensionBaseLayer from "$lib/client/extensions/ExtensionBaseLayer.svelte";
  import ScreenShot from "./ScreenShot.svelte";
  import { logger } from "$lib/client/components/debug/logger.client";
  import { NodeType } from "$lib/client/products/memotron/node/node.type";
  import { AlertType } from "$lib/client/types/notification.type";
  import SyncPane from "../syncPane/SyncPane.svelte";
  import LoginNotification from "../feedbackPane/LoginNotification.svelte";
  import { relayToBackgroundScript } from "$lib/client/utils/extension.utils";
  import { resourceInList } from "$lib/client/components/flux/resourceStores/resource.utils";
  import { ResourceError } from "$lib/client/components/error/errors";
  import { Placement } from "$lib/client/types/direction.enum";
  import ToolbarPlacementHintBlock from "../toolbar/ToolbarPlacementHintBlock.svelte";
  import { clientStorage } from "$lib/client/persistence/persistence.utils";
  import { ClientStorageKey } from "$lib/client/persistence/persistence.type";
  import { onDestroy, onMount } from "svelte";
  import { toolbarUnavailableUrlsList } from "$lib/client/products/memotron/common/urlMap";
  import type { IHighlighter } from "$lib/client/products/memotron/common/highlighters/highlight.type";
  import { Product } from "$lib/client/types/product.type";
  import { clipperCacheableStores } from "../clipper.config";
  import ClipperInMemoryCache from "../ClipperInMemoryCache.svelte";
  import { parse } from "$lib/shared/utils/json.utils";

  export let id: string;
  let textClipperRef: TextClipper;
  let extensionBaseRef: ExtensionBaseLayer;
  let isSnipActive: boolean = false;
  let loginState: number | null = null;
  let isDisableClipper = true;
  let isLoggedIn: boolean = false;
  let isDraggingToolbar: boolean = false;
  let isSidePanelOpen: boolean = false;
  let isBaseMounted: boolean = false;
  let feedbackPaneRef: FeedbackPane;

  $: isDisableClipper = toolbarUnavailableUrlsList.some((regex) => {
    return regex.test(window.location.href);
  });
  $: contentType = resolveContentTypeForUrl($webpage.url);
  $: contentTypeStr = resolveContentTypeString(contentType);
  function onActivateColor(e: CustomEvent<IHighlighter | number>) {
    textClipperRef.onActivateColor(e);
  }

  onMount(() => {
    chrome.runtime.onMessage.addListener(messageListener);
  });

  onDestroy(() => {
    chrome.runtime.onMessage.removeListener(messageListener);
  });

  async function onSaveClick() {
    try {
      if (
        isDisableClipper ||
        !isLoggedIn ||
        !isBaseMounted ||
        !$toolbarState?.isOpen ||
        $toolbarState?.isHidden
      )
        return;
      feedbackPane.onPageSaveStart(`Saving ${contentTypeStr.toLowerCase()}...`);
      if ($webpage.id) {
        feedbackPane.setErrorFeedback({
          message: "Page already saved.",
          isPreventAutoClose: false
        });
        return;
      }
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
        result = await webpage.savePage({ contentType });
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
      logger.log({ at: "onMutationRelayFromSidePanel", data });
      let result;
      if (data.action === "link") {
        result = await webpage.linkClip(data.clipId, data.linkTo, {
          isFromSidePanel: true
        });
      } else if (data.action === "unlink") {
        result = await webpage.removeLinkForClip(data.clipId, data.linkTo, {
          isFromSidePanel: true
        });
      } else if (data.action === "notes") {
        result = await webpage.persistClipNotes(data.clipId, data.notes, {
          isFromSidePanel: true
        });
      } else if (data.action === "webpageNotes") {
        result = await webpage.persistPageNotes(data.notes, {
          isFromSidePanel: true
        });
      } else if (data.action === "delete") {
        result = await webpage.removeClip(data.clipId, {
          isFromSidePanel: true
        });
      } else if (data.action === "property") {
        result = await webpage.updateClipProperty(data.clipId, data.property, {
          isFromSidePanel: true
        });
      } else if (data.action === "label") {
        result = await webpage.updateClipLabel(data.clipId, data.label, {
          isFromSidePanel: true
        });
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

  const messageListener = (message: any, sender: any, sendResponse: any) => {
    logger.log({
      at: "onMessage - Content script",
      event: message.event,
      message
    });

    const handleMessage = async () => {
      try {
        switch (message.event) {
          case ExtensionEvent.TAB_UPDATE:
            isSidePanelOpen = false;
            const token = await extensionBaseRef.onTabUpdate();
            if (token) isLoggedIn = true;
            if (!isLoggedIn) {
              setLoginState(-3);
              webpage.reset();
              return {
                status: "error",
                message: "You are not logged in"
              };
            } else {
              loginState = null;
            }
            webpage.onContextChange(message.tab);
            return { status: "success", message: "context changed" };

          case ExtensionEvent.LOGOUT:
            setLoginState(-2);
            isLoggedIn = false;
            webpage.reset();
            return { status: "success", message: "Logged out" };

          case ExtensionEvent.TOKEN_NOT_FOUND:
            setLoginState(-3);
            isLoggedIn = false;
            webpage.reset();
            return { status: "success", message: "Logged out" };

          case ExtensionEvent.PAGE_STATE_TRIGGER:
            if (!isLoggedIn) {
              setLoginState(-3);
              return {
                status: "error",
                message: "You are not logged in"
              };
            }
            await webpage.refresh();
            return {
              page: $webpage,
              toolbar: $toolbarState
            };

          case ClipperExtensionEvent.SAVE_WEBPAGE:
            if (!isLoggedIn) {
              setLoginState(-3);
              return {
                status: "error",
                message: "You are not logged in"
              };
            }
            if ($webpage.id) {
              feedbackPane.onPageSaveSuccess("Page already saved!");
              feedbackPane.toggle({ isUserInitiated: true });
            } else {
              await onSaveClick();
            }
            return { status: "success", message: "Page saved" };

          case ClipperExtensionEvent.TAKE_SCREENSHOT_SHORTCUT:
            isSnipActive = true;
            return { status: "success", message: "Screenshot taken" };

          case ClipperExtensionEvent.MINIMIZE_TOOLBAR:
            toolbarState.toggle();
            return { status: "success", message: "Toolbar minimized" };

          case ClipperExtensionEvent.ACTIVATE_LINK_BOX:
            if (!$webpage.id) {
              feedbackPane.setErrorFeedback({
                message: "Please save the page first.",
                isPreventAutoClose: false
              });
              $feedbackPane.isShowStatusOnly = true;
              feedbackPane.toggle();
              return;
            }
            if (!$feedbackPane.isShown) {
              feedbackPane.toggle({ isUserInitiated: true });
            }
            setTimeout(() => {
              feedbackPaneRef?.focusLinkBox();
            }, 100);
            return { status: "success", message: "Link box activated" };

          case ClipperExtensionEvent.TOGGLE_TOOLBAR_VISIBILITY:
            toolbarState.toggleVisibility();
            return { status: "success", message: "Toolbar closed" };

          case ClipperExtensionEvent.MUTATION_RELAY:
            const result = await onMutationRelayFromSidePanel(message.data);
            return result;
          case ExtensionEvent.MUTATION:
            await extensionBaseRef.loadInMemoryStore(message.data?.resource);
            return { status: "success", message: "In memory store reloaded" };

          case ExtensionEvent.SIDEPANEL_OPENED:
            isSidePanelOpen = true;
            return { status: "success", message: "Side panel opened" };

          case ExtensionEvent.SIDEPANEL_CLOSED:
            isSidePanelOpen = false;
            return { status: "success", message: "Side panel closed" };
        }
      } catch (error) {
        console.error("Error handling message:", error);
      }
    };
    handleMessage().then(sendResponse);
    return true;
  };

  async function setLoginState(code: number) {
    loginState = code;
    if (code === 1) {
      clientStorage.remove(ClientStorageKey.GUEST_TOOLBAR_STATE);
    } else {
      const guestToolbarState = await clientStorage.get(
        ClientStorageKey.GUEST_TOOLBAR_STATE
      );
      if (guestToolbarState) {
        const parsed = parse(guestToolbarState);
        if (parsed.isCollapsed && $toolbarState.isOpen) {
          toolbarState.toggle(false);
        }
      }
    }
  }
</script>

<ExtensionBaseLayer
  bind:this={extensionBaseRef}
  bind:isLoggedIn
  {id}
  product={{ product: Product.MEMOTRON, env: "live" }}
  stores={[...clipperCacheableStores]}
  on:login={(e) => setLoginState(e.detail.code)}
  on:mount={() => {
    isBaseMounted = true;
  }}
>
  {#if !isDisableClipper}
    {#if !$toolbarState?.isOpen && !$toolbarState?.isHidden}
      <ToolbarOpener
        on:click={() => {
          toolbarState.toggle(true);
          clientStorage.remove(ClientStorageKey.GUEST_TOOLBAR_STATE);
        }}
      />
    {:else if $toolbarState?.isHidden !== true}
      {#if isLoggedIn}
        <Toolbar
          {contentType}
          {isSidePanelOpen}
          bind:isSnipActive
          bind:isDragging={isDraggingToolbar}
          on:color={onActivateColor}
          on:save={onSaveClick}
          on:saved={() => {
            $feedbackPane.feedback = {
              message: `${contentTypeStr} already saved!`,
              type: AlertType.SUCCESS
            };
            feedbackPane.toggle({ isUserInitiated: true });
          }}
          on:summarize
          on:collapse={() => toolbarState.toggle(false)}
          on:close={() => {
            toolbarState.toggleVisibility(true);
          }}
        />
      {/if}
      <!-- <div out:fade={{ duration: 150 }}> -->
      {#if loginState !== null}
        <LoginNotification
          isWithoutToolbarContext={!isLoggedIn}
          code={loginState}
          on:later={async () => {
            toolbarState.toggle(false);
            await clientStorage.set(ClientStorageKey.GUEST_TOOLBAR_STATE, {
              isCollapsed: true
            });
          }}
          on:click={() => {
            relayToBackgroundScript({
              event: ExtensionEvent.LOGIN
            });
            loginState = null;
          }}
        />
      {:else if $feedbackPane.isShown}
        <FeedbackPane
          bind:this={feedbackPaneRef}
          pageContentType={contentType}
        />
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
    {#if isDraggingToolbar}
      {#if $toolbarState.position === Placement.Right}
        <ToolbarPlacementHintBlock position={Placement.Left} />
        <ToolbarPlacementHintBlock position={Placement.Bottom} />
      {:else if $toolbarState.position === Placement.Bottom}
        <ToolbarPlacementHintBlock position={Placement.Left} />
        <ToolbarPlacementHintBlock position={Placement.Right} />
      {:else if $toolbarState.position === Placement.Left}
        <ToolbarPlacementHintBlock position={Placement.Right} />
        <ToolbarPlacementHintBlock position={Placement.Bottom} />
      {/if}
    {/if}
  {/if}

  <!-- Not needed as shortcuts are listened from extension command API -->
  <!-- <ClipperShortcuts
    on:save={onSaveClick}
    on:collapse={() => {
      toolbarState.toggle();
    }}
  /> -->
  {#if isBaseMounted}
    <ClipperInMemoryCache />
  {/if}
</ExtensionBaseLayer>
