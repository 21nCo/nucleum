<script lang="ts">
  import ToolbarOpener from "$lib/client/extensions/clipper/toolbar/ToolbarOpener.svelte";
  import { extractFullTabData } from "$lib/client/utils/extension.utils";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import { ClipperPersistence } from "$lib/client/extensions/clipper/clipper.persistence";
  import FeedbackPane from "$lib/client/extensions/clipper/feedbackPane/feedbackPane.svelte";
  import { Position } from "$lib/client/types/direction.enum";
  import ClipperShortcuts from "$lib/client/extensions/clipper/ClipperShortcuts.svelte";
  import { onMount } from "svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import { collectionStore } from "$lib/client/products/memotron/curation/collection/collection.store";
  import { fade } from "svelte/transition";
  import Toolbar from "$lib/client/extensions/clipper/toolbar/Toolbar.svelte";
  import MultimediaClipper from "$lib/client/extensions/clipper/contentScripts/MultimediaClipper.svelte";
  import TextClipper from "$lib/client/extensions/clipper/contentScripts/TextClipper.svelte";
  import { store, toolbarState } from "./store";

  let colors = ["#be8686", "#f6e05e", "#88c0d0", "#a3be8c", "#d08770"];
  let textClipperRef: any;
  let isShowFeedbackPane = false;
  let feedback = "";
  let toolbarPosition: Position.Right | Position.Left | Position.Bottom =
    Position.Right;
  $: toolbarPosition = $toolbarState.position ?? Position.Right;
  function onActivateColor(e) {
    textClipperRef.onActivateColor(e);
  }
  async function refreshPage(url: string | undefined = undefined) {
    await store.refresh(url);
  }
  async function onsaveWebpageClick() {
    feedback = "Saving page...";
    isShowFeedbackPane = true;
    const data = extractFullTabData();
    await new ClipperPersistence().saveWebpage(data);
    await refreshPage();
    feedback = "Page saved!";
  }
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Content script - message received: ", {
      message,
      sender
    });
    if (
      message.event === ExtensionEvent.TAB_CHANGE ||
      message.event === ExtensionEvent.TAB_UPDATE
    ) {
      refreshPage(message.tab.url);
      return;
    } else if (message.event === ExtensionEvent.READ_PAGE_CONTENT) {
      const data = extractFullTabData();
      sendResponse(data);
    }
  });

  onMount(() => {
    window.addEventListener(
      "message",
      function (event) {
        if (event.source != window) return;
        if (event.data.type && event.data.type == "signin") {
          console.log("Token data is: " + JSON.stringify(event.data.token));
          localStorage.setItem("stoken", event.data.token.token);
          chrome.storage.sync.set(
            { stoken: event.data.token.token },
            function () {
              console.log("Token is stored to be used later.");
            }
          );
        }
      },
      false
    );
    dataManager.initialize([nodeStore, collectionStore, toolbarState, store]);
    dataManager.refreshOnAppear();
  });
</script>

<div class="cs_tidigit_light_blue dark:cs_tidigit_dark_blue relative flex">
  {#if !$toolbarState?.isOpen}
    <ToolbarOpener on:click={() => toolbarState.toggle(true)} />
  {:else}
    <Toolbar
      {colors}
      bind:position={toolbarPosition}
      on:color={onActivateColor}
      on:save={onsaveWebpageClick}
      on:saved={() => {
        feedback = "Page saved!";
        isShowFeedbackPane = true;
      }}
      on:snip
      on:summarize
      on:collapse={() => toolbarState.toggle(false)}
    />
    {#if isShowFeedbackPane}
      <div out:fade>
        <FeedbackPane
          bind:toolbarPosition
          bind:feedback
          bind:isShown={isShowFeedbackPane}
        />
      </div>
    {/if}
    <TextClipper bind:this={textClipperRef} {colors} />
    <MultimediaClipper {colors} />
  {/if}
  <ClipperShortcuts
    on:save={onsaveWebpageClick}
    on:collapse={() => {
      toolbarState.toggle();
    }}
  />
</div>
