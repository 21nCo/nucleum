<script lang="ts">
  import ToolbarOpener from "$lib/client/extensions/clipper/toolbar/ToolbarOpener.svelte";
  import { extractFullTabData } from "$lib/client/extensions/clipper/clipper.utils";
  import { ExtensionEvent } from "$lib/client/types/extension.type";
  import FeedbackPane from "$lib/client/extensions/clipper/feedbackPane/FeedbackPane.svelte";
  import ClipperShortcuts from "$lib/client/extensions/clipper/ClipperShortcuts.svelte";
  import { onMount } from "svelte";
  import { dataManager } from "$lib/client/persistence/dataManager";
  import { nodeStore } from "$lib/client/products/memotron/node/node.store";
  import { collectionStore } from "$lib/client/products/memotron/collection/collection.store";
  import { fade } from "svelte/transition";
  import Toolbar from "$lib/client/extensions/clipper/toolbar/Toolbar.svelte";
  import MultimediaClipper from "$lib/client/extensions/clipper/contentScripts/MultimediaClipper.svelte";
  import TextClipper from "$lib/client/extensions/clipper/contentScripts/TextClipper.svelte";
  import { webpage, toolbarState } from "./store";
  import { ClipperExtensionEvent } from "$lib/client/products/memotron/common/clip.type";
  import ExtensionBaseLayer from "$lib/client/extensions/ExtensionBaseLayer.svelte";
  import { linker } from "$lib/client/products/memotron/memotron.store";
  import ScreenShot from "./ScreenShot.svelte";
  import type { IImageElement } from "./types";
  export let id: string;
  let nodeId: string = "";
  let colors = ["#be8686", "#f6e05e", "#88c0d0", "#a3be8c", "#d08770"];
  let textClipperRef: any;
  let isShowFeedbackPane = false;
  let feedback = "";
  let isSnipEnabled: boolean = false;
  let image: IImageElement | null = null;
  function onActivateColor(e) {
    textClipperRef.onActivateColor(e);
  }
  async function onsaveWebpageClick() {
    feedback = "Saving page...";
    isShowFeedbackPane = true;
    const data = extractFullTabData();
    await webpage.savePage(data);
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
  function resetFeedbackPaneInputs() {
    image = null;
    nodeId = "";
    feedback = "";
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
      on:color={onActivateColor}
      on:save={onsaveWebpageClick}
      on:saved={() => {
        feedback = "Page saved!";
        isShowFeedbackPane = !isShowFeedbackPane;
      }}
      on:snip={() => {
        isSnipEnabled = !isSnipEnabled;
      }}
      on:summarize
      on:collapse={() => toolbarState.toggle(false)}
    />
    {#if isShowFeedbackPane}
      <!-- <div out:fade={{ duration: 150 }}> -->
      <FeedbackPane
        bind:feedback
        bind:isShown={isShowFeedbackPane}
        on:resetInputs={resetFeedbackPaneInputs}
        {image}
        {nodeId}
      />
      <!-- </div> -->
    {/if}
    <TextClipper bind:this={textClipperRef} {colors} />
    <MultimediaClipper {colors} />
    {#if isSnipEnabled}<ScreenShot
        on:snipSaved={(e) => {
          image = { src: e.detail.s3URL, alt: "Screenshot" };
          nodeId = e.detail.id;
          feedback = "Screenshot saved!";
          isShowFeedbackPane = false;
          isShowFeedbackPane = true;
        }}
      />{/if}
  {/if}
  <ClipperShortcuts
    on:save={onsaveWebpageClick}
    on:collapse={() => {
      toolbarState.toggle();
    }}
  />
</ExtensionBaseLayer>
